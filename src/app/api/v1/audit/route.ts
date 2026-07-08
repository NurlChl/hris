import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  // Check RBAC permission for settings read
  const perm = await checkPermission(session.user.id, "settings", "read");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk melihat log audit", null, 403);
  }

  await connectToDatabase();

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const moduleFilter = url.searchParams.get("module") || "";
  const actionFilter = url.searchParams.get("action") || "";

  const skip = (page - 1) * limit;

  // Build filter query
  const query: Record<string, any> = {};
  if (moduleFilter) {
    query.module = moduleFilter;
  }
  if (actionFilter) {
    query.action = actionFilter;
  }

  // Fetch count and logs
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Retrieve unique user details to map to the logs (avoiding N+1 lookup)
  const userIds = Array.from(new Set(logs.map(log => log.userId).filter(Boolean)));
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email role")
    .lean();

  const userMap = new Map(users.map(u => [(u._id as any).toString(), u]));

  const mappedLogs = logs.map(log => {
    const userKey = log.userId ? log.userId.toString() : "";
    const userDetail = userMap.get(userKey) || null;
    return {
      ...log,
      user: userDetail ? {
        name: userDetail.name,
        email: userDetail.email,
        role: userDetail.role
      } : {
        name: "System / Anonymous",
        email: "-",
        role: "-"
      }
    };
  });

  return apiSuccess(
    {
      logs: mappedLogs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    },
    "Berhasil memuat log audit"
  );
});
