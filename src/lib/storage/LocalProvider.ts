import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { StorageProvider } from "./StorageProvider";

export class LocalProvider implements StorageProvider {
  private baseDir: string;
  private secret: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_PATH || "./public/uploads";
    // Initialize secure secret for signing local URLs
    this.secret = process.env.NEXTAUTH_SECRET || "default-secret-for-local-storage-signing";
  }

  private getFullPath(relativePath: string): string {
    const resolvedBase = path.resolve(process.cwd(), this.baseDir);
    const resolvedPath = path.resolve(resolvedBase, relativePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error("Directory traversal attempt detected");
    }
    return resolvedPath;
  }

  async upload(file: Buffer | Blob, relativePath: string, mimeType?: string): Promise<string> {
    const fullPath = this.getFullPath(relativePath);
    const dir = path.dirname(fullPath);

    // Ensure the folder exists
    await fs.mkdir(dir, { recursive: true });

    let buffer: Buffer;
    if (file instanceof Blob) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    await fs.writeFile(fullPath, buffer);
    
    // Return relative URL from public root
    return `/uploads/${relativePath.replace(/\\/g, "/")}`;
  }

  getUrl(relativePath: string): string {
    return `/uploads/${relativePath.replace(/\\/g, "/")}`;
  }

  async getSignedUrl(relativePath: string, expiresInSeconds: number = 900): Promise<string> {
    // Generate secure local URL signed with HMAC
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const cleanPath = relativePath.replace(/\\/g, "/");
    
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(`${cleanPath}:${expiresAt}`);
    const signature = hmac.digest("hex");

    return `/api/v1/storage/secure?path=${encodeURIComponent(cleanPath)}&expires=${expiresAt}&sig=${signature}`;
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  /**
   * Helper to verify a signed local path request
   */
  verifySignature(relativePath: string, expiresAt: number, signature: string): boolean {
    if (Date.now() / 1000 > expiresAt) {
      return false; // Expired
    }
    const cleanPath = relativePath.replace(/\\/g, "/");
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(`${cleanPath}:${expiresAt}`);
    const expectedSignature = hmac.digest("hex");
    
    // Ensure signatures have identical length before timingSafeEqual to avoid crashes
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}
