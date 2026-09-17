import mongoose from "mongoose";
import dns from "dns";

// Disable strictPopulate globally to avoid dynamic routing/HMR populate errors
mongoose.set("strictPopulate", false);

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * A non-SRV connection string for the same cluster, used only when name
 * resolution is broken.
 *
 * `mongodb+srv://` must perform an SRV lookup, and SRV can only go through
 * Node's c-ares resolver. On some Windows machines c-ares is unusable — it
 * fails to read the adapter's DNS settings, falls back to `127.0.0.1`, and
 * answers every query with `querySrv ECONNREFUSED`. Pointing it elsewhere with
 * `dns.setServers()` fixes this in a plain Node process but *not* inside the
 * Next dev server, where the override demonstrably does not reach the driver.
 *
 * A plain `mongodb://` seed list needs no SRV at all: hosts are resolved with
 * `dns.lookup()`, which uses the OS resolver and keeps working throughout. So
 * this is the reliable way out, and it is the last thing tried rather than the
 * first because SRV survives Atlas moving hosts around and a seed list does not.
 */
const MONGODB_URI_DIRECT = process.env.MONGODB_URI_DIRECT;

if (!MONGODB_URI) {
  console.warn("WARNING: MONGODB_URI environment variable is not defined. The application will run without a database connection. Please configure it in your .env file.");
}

/* ------------------------------------------------------------------ */
/* DNS                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Resolvers used when the platform's own are unusable.
 *
 * Tried before the direct URI because it is the less invasive of the two: when
 * it works, the cluster is still reached through SRV.
 *
 * Override with `DNS_SERVERS` (comma separated) where these are unreachable.
 */
// `||` rather than `??`: an empty `DNS_SERVERS=` line in .env must mean "use the defaults".
const FALLBACK_DNS = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Set once the fallback resolvers have been installed, so it happens once. */
let fallbackDnsApplied = false;

/** True when an error came from resolving a name rather than from the server. */
function isResolverFailure(err: unknown): boolean {
  const e = err as { code?: unknown; syscall?: string; message?: string } | null;
  if (!e) return false;

  const code = typeof e.code === "string" ? e.code : "";
  const dnsCode = ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ESERVFAIL", "ETIMEOUT"].includes(code);
  const dnsSyscall = e.syscall === "querySrv" || e.syscall === "queryTxt" || e.syscall === "queryA";

  // Mongoose wraps the driver's DNS error, so the marker often survives only in
  // the message by the time it reaches here.
  const wrapped = /querySrv|queryTxt|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/.test(e.message ?? "");

  return dnsSyscall || (dnsCode && dnsSyscall) || wrapped;
}

/**
 * Switches Node's resolver to the fallback servers after a lookup has failed.
 *
 * An earlier version tried to *predict* the problem by inspecting
 * `dns.getServers()` and only overriding when every entry looked dead. That
 * guess is wrong in practice: c-ares can report a perfectly sane server such as
 * `192.168.1.1` and still answer every query with ECONNREFUSED, so the override
 * never fired and the connection kept failing. Reacting to the actual failure
 * needs no guess about why the resolver is broken.
 *
 * Returns whether anything changed, so the caller knows if a retry is worth it.
 */
function applyFallbackDns(): boolean {
  if (fallbackDnsApplied || FALLBACK_DNS.length === 0) return false;

  try {
    const before = dns.getServers();
    if (before.length === FALLBACK_DNS.length && before.every((s, i) => s === FALLBACK_DNS[i])) {
      // Already using them; the failure is not something we can fix here.
      fallbackDnsApplied = true;
      return false;
    }

    dns.setServers(FALLBACK_DNS);
    fallbackDnsApplied = true;
    console.warn(
      `[DB] Lookup DNS gagal memakai resolver ${before.join(", ") || "bawaan"}. ` +
        `Beralih ke ${FALLBACK_DNS.join(", ")} lalu mencoba ulang. ` +
        `Setel DNS_SERVERS di .env bila server ini juga diblokir.`
    );
    return true;
  } catch (err) {
    // `dns.setServers()` throws while a lookup is in flight. Leaving the flag
    // down lets the next attempt try again instead of giving up for good.
    console.warn("[DB] Tidak dapat mengganti resolver DNS:", (err as Error).message);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global is used here to maintain a cached connection across hot-reloads in development
// and prevent multiple connections in serverless environments.
// The connection is cached on globalThis so Next.js hot reloads (and warm
// serverless invocations) reuse one pool instead of opening a new connection
// per module evaluation.
const globalWithMongoose = globalThis as typeof globalThis & {
  __hrisMongoose?: MongooseCache;
};

const cached: MongooseCache =
  globalWithMongoose.__hrisMongoose ??
  (globalWithMongoose.__hrisMongoose = { conn: null, promise: null });

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
  };

  const open = (uri: string) =>
    mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log("Successfully connected to MongoDB");
      return mongooseInstance;
    });

  /**
   * Two escalating recoveries, both only for name resolution failing.
   *
   * Anything else — bad credentials, IP not allowlisted, cluster paused — is a
   * real problem that must surface immediately rather than be retried against a
   * second address.
   */
  const openWithRecovery = async () => {
    try {
      return await open(MONGODB_URI);
    } catch (err) {
      if (!isResolverFailure(err)) throw err;

      // 1. Point the resolver somewhere that answers, and try SRV again.
      if (applyFallbackDns()) {
        try {
          return await open(MONGODB_URI);
        } catch (retryErr) {
          if (!isResolverFailure(retryErr)) throw retryErr;
          err = retryErr;
        }
      }

      // 2. Give up on SRV entirely and use the seed list, which only needs the
      //    OS resolver.
      if (MONGODB_URI_DIRECT) {
        console.warn("[DB] Lookup SRV tetap gagal. Beralih ke MONGODB_URI_DIRECT (tanpa SRV).");
        return await open(MONGODB_URI_DIRECT);
      }

      console.error(
        "[DB] Lookup SRV gagal dan MONGODB_URI_DIRECT belum disetel. " +
          "Isi variabel itu di .env dengan connection string non-SRV (mongodb://) " +
          "agar koneksi tidak bergantung pada resolver SRV."
      );
      throw err;
    }
  };

  if (!cached.promise) {
    cached.promise = openWithRecovery().catch((err) => {
      console.error("MongoDB connection failed:", (err as Error).message);
      cached.promise = null; // Reset promise to allow retrying later
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Checks if the database is currently connected.
 * Useful for health-checks and graceful degradation.
 */
export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * True when an error is the database being unreachable rather than anything the
 * caller did wrong.
 *
 * Mongoose surfaces this in several shapes: a named selection/network error, or
 * — when the Atlas SRV record cannot be resolved at all — a bare DNS error
 * whose only marker is the syscall. Callers use it to tell an outage apart from
 * a real failure, so that a login during an outage does not report itself as
 * wrong credentials.
 */
export function isDbUnreachable(err: unknown): boolean {
  const e = err as { name?: string; code?: unknown; syscall?: string } | null;
  if (!e) return false;

  return (
    e.name === "MongooseServerSelectionError" ||
    e.name === "MongoNetworkError" ||
    e.name === "MongoServerSelectionError" ||
    e.syscall === "querySrv" ||
    (typeof e.code === "string" &&
      ["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"].includes(e.code))
  );
}
