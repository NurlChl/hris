import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Complaint from "@/models/Complaint";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  const userRole = session.user.role;
  const userEmpId = session.user.employeeId;

  const filter: Record<string, any> = {};

  if (userRole === "SUPERADMIN" || userRole === "HRD" || userRole === "DIREKSI") {
    // Admins can see matching target complaints
    const targetMap: Record<string, string> = {
      HRD: "hrd",
      DIREKSI: "direksi"
    };
    if (userRole !== "SUPERADMIN") {
      filter.target = targetMap[userRole];
    }
  } else if (userRole === "SPV") {
    filter.target = "spv";
    // SPV can only see reports within their division
    // We can filter on populate or handle dynamically
  } else {
    // STAFF can only see their own (non-anonymous) reports
    if (!userEmpId) return apiSuccess([]);
    filter.employeeId = userEmpId;
    filter.isAnonymous = false;
  }

  const complaints = await Complaint.find(filter)
    .populate("employeeId")
    .sort({ createdAt: -1 });

  return apiSuccess(complaints, "Berhasil memuat keluhan");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const body = await req.json();
  const { isAnonymous, target, description, attachments } = body;

  if (!target || !description || !["spv", "hrd", "direksi"].includes(target)) {
    return apiError("BAD_REQUEST", "Data target ('spv'/'hrd'/'direksi') dan description wajib disediakan");
  }

  await connectToDatabase();

  const employeeId = session.user.employeeId;

  const complaint = await Complaint.create({
    employeeId: isAnonymous ? null : employeeId,
    isAnonymous: !!isAnonymous,
    target,
    description,
    attachments: attachments || ""
  });

  // Log activity (only log employee name if not anonymous)
  await logActivity({
    userId: isAnonymous ? null : session.user.id,
    action: "SUBMIT_COMPLAINT",
    module: "settings", // using settings as standard log bucket
    before: null,
    after: { _id: complaint._id, isAnonymous, target },
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  return apiSuccess(complaint, "Berhasil mengirimkan keluhan/pengaduan.");
});
