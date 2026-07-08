import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Employee from "@/models/Employee";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req, { params }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const { id } = await params;
  if (!id || id === "null" || id === "undefined") {
    return apiError("BAD_REQUEST", "ID karyawan tidak valid");
  }

  await connectToDatabase();

  // If fetching own profile, allow. Otherwise check permission.
  if (session.user.employeeId !== id) {
    const perm = await checkPermission(session.user.id, "attendance", "read");
    if (!perm.allowed) {
      return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk melihat data karyawan ini", null, 403);
    }
  }

  const employee = await Employee.findById(id)
    .populate("branchId")
    .populate("divisionId")
    .populate("positionId")
    .populate("supervisorId")
    .populate("storeManagerId")
    .populate("areaManagerId");

  if (!employee) {
    return apiError("NOT_FOUND", "Data karyawan tidak ditemukan");
  }

  return apiSuccess(employee, "Berhasil memuat data karyawan");
});

export const DELETE = wrapRouteHandler(async (req, { params }) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "attendance", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk menghapus data karyawan", null, 403);
  }

  const { id } = await params;
  if (!id) {
    return apiError("BAD_REQUEST", "ID karyawan wajib disediakan");
  }

  await connectToDatabase();
  const employee = await Employee.findById(id);
  if (!employee) {
    return apiError("NOT_FOUND", "Data karyawan tidak ditemukan");
  }

  // Delete matching User login account first
  await User.deleteMany({ employeeId: id });
  await Employee.findByIdAndDelete(id);

  await logActivity({
    userId: session.user.id,
    action: "DELETE_EMPLOYEE",
    module: "attendance",
    before: employee.toObject(),
    after: null,
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  return apiSuccess({ id }, "Berhasil menghapus data karyawan");
});
