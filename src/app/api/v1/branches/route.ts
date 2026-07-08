import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Branch from "@/models/Branch";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();
  const branches = await Branch.find({});
  return apiSuccess(branches, "Berhasil memuat data cabang");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "attendance", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi cabang", null, 403);
  }

  const body = await req.json();
  const { id, name, address, lat, lng, radiusMeter, workHours } = body;

  if (!name || !address || lat === undefined || lng === undefined) {
    return apiError("BAD_REQUEST", "Data nama, alamat, lat, dan lng wajib diisi");
  }

  await connectToDatabase();

  let branch;
  let oldData = null;

  if (id) {
    // Update existing branch
    oldData = await Branch.findById(id);
    if (!oldData) {
      return apiError("NOT_FOUND", "Cabang tidak ditemukan");
    }
    branch = await Branch.findByIdAndUpdate(
      id,
      { name, address, lat, lng, radiusMeter: radiusMeter || 15, workHours: workHours || { start: "09:00", end: "17:00" } },
      { new: true }
    );

    await logActivity({
      userId: session.user.id,
      action: "UPDATE_BRANCH",
      module: "attendance",
      before: oldData.toObject(),
      after: branch.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });
  } else {
    // Create new branch
    branch = await Branch.create({
      name,
      address,
      lat,
      lng,
      radiusMeter: radiusMeter || 15,
      workHours: workHours || { start: "09:00", end: "17:00" },
    });

    await logActivity({
      userId: session.user.id,
      action: "CREATE_BRANCH",
      module: "attendance",
      before: null,
      after: branch.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });
  }

  return apiSuccess(branch, id ? "Berhasil memperbarui cabang" : "Berhasil menambahkan cabang");
});
