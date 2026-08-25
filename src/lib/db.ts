import mongoose from "mongoose";
import dns from "dns";

// Disable strictPopulate globally to avoid dynamic routing/HMR populate errors
mongoose.set("strictPopulate", false);

// Custom DNS servers fallback to prevent ECONNREFUSED on MongoDB Atlas SRV queries in Windows / local ISP DNS
try {
  if (typeof dns.setServers === "function") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
} catch (e) {
  // Ignore if dns.setServers is restricted in the execution environment
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("WARNING: MONGODB_URI environment variable is not defined. The application will run without a database connection. Please configure it in your .env file.");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global is used here to maintain a cached connection across hot-reloads in development
// and prevent multiple connections in serverless environments.
let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("Successfully connected to MongoDB");
      return mongooseInstance;
    }).catch((err) => {
      console.error("MongoDB connection failed:", err.message);
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
