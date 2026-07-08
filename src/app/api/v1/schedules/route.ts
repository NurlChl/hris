import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import WorkSchedule from "@/models/WorkSchedule";
import EmployeeSchedule from "@/models/EmployeeSchedule";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "template";

  if (type === "template") {
    const templates = await WorkSchedule.find({});
    return apiSuccess(templates, "Berhasil memuat template jadwal kerja");
  } else {
    // Get active assignments
    const employeeId = url.searchParams.get("employeeId");
    const filter: Record<string, any> = {};
    if (employeeId) {
      filter.employeeId = employeeId;
    }
    const assignments = await EmployeeSchedule.find(filter)
      .populate("employeeId")
      .populate("scheduleId");
    return apiSuccess(assignments, "Berhasil memuat penugasan jadwal karyawan");
  }
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "attendance", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi jadwal", null, 403);
  }

  const body = await req.json();
  const { mode, id, name, clockIn, clockOut, isBreakActive, breakOut, breakIn, activeDays, gracePeriodMinutes, employeeId, scheduleId, date } = body;

  await connectToDatabase();

  if (mode === "assign") {
    // Assign schedule template to employee on specific date
    if (!employeeId || !scheduleId || !date) {
      return apiError("BAD_REQUEST", "Data employeeId, scheduleId, dan date wajib diisi");
    }

    const assignment = await EmployeeSchedule.findOneAndUpdate(
      { employeeId, date: new Date(date) },
      { scheduleId },
      { new: true, upsert: true }
    );

    await logActivity({
      userId: session.user.id,
      action: "ASSIGN_SCHEDULE",
      module: "attendance",
      before: null,
      after: assignment.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(assignment, "Berhasil menugaskan jadwal kerja");
  } else {
    // Manage template (create/update)
    if (!name || !clockIn || !clockOut || !activeDays) {
      return apiError("BAD_REQUEST", "Data template nama, clockIn, clockOut, dan activeDays wajib diisi");
    }

    let template;
    let oldData = null;

    if (id) {
      oldData = await WorkSchedule.findById(id);
      if (!oldData) {
        return apiError("NOT_FOUND", "Template jadwal tidak ditemukan");
      }
      template = await WorkSchedule.findByIdAndUpdate(
        id,
        { name, clockIn, clockOut, isBreakActive, breakOut, breakIn, activeDays, gracePeriodMinutes: gracePeriodMinutes || 0 },
        { new: true }
      );

      await logActivity({
        userId: session.user.id,
        action: "UPDATE_SCHEDULE_TEMPLATE",
        module: "attendance",
        before: oldData.toObject(),
        after: template.toObject(),
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "",
      });
    } else {
      template = await WorkSchedule.create({
        name,
        clockIn,
        clockOut,
        isBreakActive,
        breakOut,
        breakIn,
        activeDays,
        gracePeriodMinutes: gracePeriodMinutes || 0,
      });

      await logActivity({
        userId: session.user.id,
        action: "CREATE_SCHEDULE_TEMPLATE",
        module: "attendance",
        before: null,
        after: template.toObject(),
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "",
      });
    }

    return apiSuccess(template, id ? "Berhasil memperbarui template jadwal" : "Berhasil menambahkan template jadwal");
  }
});
