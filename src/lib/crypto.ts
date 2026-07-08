import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-very-secure-32-byte-key-placeholder";

// Generate a 32-byte key from the secret
const KEY = crypto.createHash("sha256").update(SECRET).digest();

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return encryptedText; // Fallback to raw if decryption fails (e.g. data wasn't encrypted)
  }
}
