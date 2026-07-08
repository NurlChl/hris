import AuditLog from "@/models/AuditLog";
import { connectToDatabase, isDbConnected } from "../db";

interface LogOptions {
  userId?: string | null;
  action: string;
  module: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ip?: string;
  userAgent?: string;
}

export async function logActivity({
  userId = null,
  action,
  module,
  before = null,
  after = null,
  ip = "",
  userAgent = "",
}: LogOptions) {
  const timestamp = new Date();

  console.log(`[AUDIT LOG] [${timestamp.toISOString()}] Module: ${module} | Action: ${action} | User: ${userId || "SYSTEM"}`);

  try {
    // Graceful check if db is connected
    await connectToDatabase();
    
    if (isDbConnected()) {
      await AuditLog.create({
        userId,
        action,
        module,
        before,
        after,
        ip,
        userAgent,
        timestamp,
      });
    } else {
      console.warn("[AUDIT LOG] Database is not connected. Audit log not persisted to DB.");
    }
  } catch (error: any) {
    console.error("[AUDIT LOG] Failed to persist audit log:", error.message);
  }
}
