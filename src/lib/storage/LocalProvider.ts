import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { contentTypeForKey, type StorageProvider } from "./StorageProvider";

/**
 * Disk-backed storage for single-server / development deployments.
 *
 * The base directory defaults to `./storage/uploads`, which is deliberately
 * **outside** `public/`. Files under `public/` are served statically by
 * Next.js, which previously made every attendance selfie and payslip readable
 * by anyone who could guess the path — the signed URLs were decorative. Now the
 * only way in is `/api/v1/storage/secure`, which checks both the session and the
 * HMAC signature.
 */
export class LocalProvider implements StorageProvider {
  private baseDir: string;
  private secret: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_PATH || "./storage/uploads";
    const secret =
      process.env.STORAGE_SIGNING_SECRET ||
      process.env.ENCRYPTION_KEY ||
      process.env.NEXTAUTH_SECRET ||
      process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error(
        "NEXTAUTH_SECRET / STORAGE_SIGNING_SECRET belum diset — URL file tidak dapat ditandatangani."
      );
    }
    this.secret = secret;
  }

  /** Resolves a key inside the base dir, refusing traversal. */
  private resolve(key: string): string {
    const base = path.resolve(process.cwd(), this.baseDir);
    const full = path.resolve(base, key);
    if (full !== base && !full.startsWith(base + path.sep)) {
      throw new Error("Percobaan akses direktori di luar area penyimpanan ditolak.");
    }
    return full;
  }

  async upload(file: Buffer | Blob, key: string, _mimeType?: string): Promise<string> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });

    const buffer =
      file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());

    await fs.writeFile(full, buffer);
    return key.replace(/\\/g, "/");
  }

  getUrl(key: string): string {
    // Even "non-sensitive" local files go through the authenticated route;
    // nothing on disk is publicly reachable by design.
    return `/api/v1/storage/secure?key=${encodeURIComponent(key.replace(/\\/g, "/"))}`;
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const cleanKey = key.replace(/\\/g, "/");
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = this.sign(cleanKey, expires);
    return `/api/v1/storage/secure?key=${encodeURIComponent(cleanKey)}&expires=${expires}&sig=${sig}`;
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async read(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const buffer = await fs.readFile(this.resolve(key));
    return { buffer, contentType: contentTypeForKey(key) };
  }

  private sign(key: string, expires: number): string {
    return crypto.createHmac("sha256", this.secret).update(`${key}:${expires}`).digest("hex");
  }

  /** Verifies a signed link; false when expired, malformed, or tampered with. */
  verifySignature(key: string, expires: number, signature: string): boolean {
    if (!Number.isFinite(expires) || Date.now() / 1000 > expires) return false;
    const expected = this.sign(key.replace(/\\/g, "/"), expires);
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
