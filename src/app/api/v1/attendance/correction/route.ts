import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import Employee from "@/models/Employee";
import AttendanceCorrection from "@/models/AttendanceCorrection";
import ApprovalInstance from "@/models/ApprovalInstance";
import Setting from "@/models/Setting";
import mongoose from "mongoose";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  // Find user's employee profile
  const employee = await Employee.findOne({ officeEmail: session.user.email });
  if (!employee) {
    return apiError("NOT_FOUND", "Profil karyawan Anda tidak ditemukan");
  }

  // If HRD, Audit, or Superadmin, they can query all corrections or filter by employeeId
  const { searchParams } = new URL(req.url);
  const filterEmployeeId = searchParams.get("employeeId");
  
  let filter: any = { employeeId: employee._id };
  
  // Superadmin or HRD or Audit can read all
  const isAdmin = ["SUPERADMIN", "HRD", "AUDIT"].includes(session.user.role || "");
  if (isAdmin) {
    if (filterEmployeeId) {
      filter = { employeeId: new mongoose.Types.ObjectId(filterEmployeeId) };
    } else {
      filter = {};
    }
  }

  const corrections = await AttendanceCorrection.find(filter)
    .populate("employeeId", "name employeeId")
    .sort({ createdAt: -1 });

  return apiSuccess(corrections, "Berhasil memuat data koreksi absensi");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan pengajuan ini", null, 401);
  }

  await connectToDatabase();

  // Get employee profile
  const employee = await Employee.findOne({ officeEmail: session.user.email });
  if (!employee) {
    return apiError("NOT_FOUND", "Profil karyawan tidak ditemukan");
  }

  const body = await req.json();
  const { date, clockInTime, clockOutTime, reasonType, reasonNote, evidenceUrl } = body;

  if (!date || !clockInTime || !clockOutTime || !reasonType || !reasonNote) {
    return apiError("BAD_REQUEST", "Seluruh data pengajuan wajib diisi");
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Check if correction request for this date already exists
  const existing = await AttendanceCorrection.findOne({
    employeeId: employee._id,
    date: targetDate,
    status: { $in: ["pending", "approved"] }
  });
  if (existing) {
    return apiError("BAD_REQUEST", "Anda sudah memiliki pengajuan koreksi aktif untuk tanggal ini");
  }

  // Check quota limit for the target month
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await AttendanceCorrection.countDocuments({
    employeeId: employee._id,
    date: { $gte: startOfMonth, $lte: endOfMonth },
    status: { $in: ["approved", "pending"] }
  });

  // Get max correction limit from settings
  const limitSetting = await Setting.findOne({ key: "max_absen_correction" });
  const maxLimit = limitSetting ? parseInt(limitSetting.value) : 3;

  const isLimitExceeded = count >= maxLimit;

  // Standard steps vs Urgent Override steps
  let steps: Array<{ stepNumber: number; approverRole: string; status: string }> = [];

  if (isLimitExceeded) {
    // Overlimit approval chain: HRD -> AUDIT -> DIREKSI (urgent override)
    steps = [
      { stepNumber: 1, approverRole: "HRD", status: "pending" },
      { stepNumber: 2, approverRole: "AUDIT", status: "pending" },
      { stepNumber: 3, approverRole: "DIREKSI", status: "pending" }
    ];
  } else {
    // Normal approval chain: SPV -> HRD
    steps = [
      { stepNumber: 1, approverRole: "SPV", status: "pending" },
      { stepNumber: 2, approverRole: "HRD", status: "pending" }
    ];
  }

  // 1. Create correction request
  const correction = await AttendanceCorrection.create({
    employeeId: employee._id,
    date: targetDate,
    clockInTime,
    clockOutTime,
    reasonType,
    reasonNote,
    evidenceUrl: evidenceUrl || "",
    status: "pending"
  });

  // 2. Create approval instance
  const approvalInstance = await ApprovalInstance.create({
    refType: "correction",
    refId: correction._id,
    currentStep: 1,
    status: "pending",
    stepsStatus: steps,
    history: [
      {
        action: "SUBMITTED",
        userId: session.user.id,
        timestamp: new Date(),
        comment: isLimitExceeded 
          ? `Pengajuan koreksi melebihi kuota bulanan (${count}/${maxLimit}). Memerlukan persetujuan darurat (HRD -> Audit -> Direksi).` 
          : `Pengajuan koreksi absensi normal (${count + 1}/${maxLimit}).`
      }
    ]
  });

  // 3. Link approval instance back to correction
  correction.approvalInstanceId = approvalInstance._id;
  await correction.save();

  return apiSuccess(
    correction,
    isLimitExceeded 
      ? `Pengajuan koreksi berhasil dibuat. Peringatan: Melebihi kuota bulanan (${count}/${maxLimit}), membutuhkan persetujuan berjenjang HRD, Audit, & Direksi.`
      : `Pengajuan koreksi berhasil dikirim (${count + 1}/${maxLimit}).`
  );
});
