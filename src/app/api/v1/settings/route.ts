import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Setting from "@/models/Setting";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();
  const settings = await Setting.find({});
  
  // Transform to a key-value object
  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, any>);

  return apiSuccess(settingsMap, "Berhasil memuat pengaturan");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  // Check dynamic permissions
  const perm = await checkPermission(session.user.id, "settings", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengubah pengaturan", null, 403);
  }

  const body = await req.json();
  if (!body || typeof body !== "object") {
    return apiError("BAD_REQUEST", "Format data tidak valid");
  }

  await connectToDatabase();
  
  const oldSettings = await Setting.find({});
  const oldMap = oldSettings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, any>);

  const updatedMap: Record<string, any> = {};

  // Bulk update settings key-value pair
  for (const [key, value] of Object.entries(body)) {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );
    updatedMap[key] = setting.value;
  }

  // Audit logging
  await logActivity({
    userId: session.user.id,
    action: "UPDATE_SETTINGS",
    module: "settings",
    before: oldMap,
    after: updatedMap,
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  return apiSuccess(updatedMap, "Berhasil memperbarui pengaturan");
});
