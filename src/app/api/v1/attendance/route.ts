import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { calculateDistanceMeters } from "@/lib/geo";
import { storageProvider } from "@/lib/storage";
import { logActivity } from "@/lib/audit/logger";
import Attendance from "@/models/Attendance";
import Employee from "@/models/Employee";
import Branch from "@/models/Branch";
import EmployeeSchedule from "@/models/EmployeeSchedule";
import WorkSchedule from "@/models/WorkSchedule";
import Setting from "@/models/Setting";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();
  
  // Fetch current month attendances for current employee
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const filter: Record<string, any> = {
    date: { $gte: startOfMonth, $lte: endOfMonth }
  };

  if (session.user.role === "SUPERADMIN" || session.user.role === "HRD" || session.user.role === "AUDIT") {
    // If admin is requesting, they might want all or filtered by employeeId query
    const url = new URL(req.url);
    const qEmpId = url.searchParams.get("employeeId");
    if (qEmpId) {
      filter.employeeId = qEmpId;
    }
  } else {
    // Regular employees can only view their own logs
    if (!session.user.employeeId) {
      return apiSuccess([], "Belum ada riwayat absensi");
    }
    filter.employeeId = session.user.employeeId;
  }

  const logs = await Attendance.find(filter)
    .populate({
      path: "employeeId",
      populate: { path: "branchId" }
    })
    .sort({ date: -1 });

  const settingsKeys = [
    "require_selfie_clock_in",
    "require_selfie_break_out",
    "require_selfie_break_in",
    "require_selfie_clock_out",
    "enable_break_attendance"
  ];
  const settingsList = await Setting.find({ key: { $in: settingsKeys } });
  const settingsMap = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, any>);

  const finalSettings = {
    require_selfie_clock_in: settingsMap.require_selfie_clock_in !== undefined ? (settingsMap.require_selfie_clock_in === true || settingsMap.require_selfie_clock_in === "true") : true,
    require_selfie_break_out: settingsMap.require_selfie_break_out !== undefined ? (settingsMap.require_selfie_break_out === true || settingsMap.require_selfie_break_out === "true") : false,
    require_selfie_break_in: settingsMap.require_selfie_break_in !== undefined ? (settingsMap.require_selfie_break_in === true || settingsMap.require_selfie_break_in === "true") : false,
    require_selfie_clock_out: settingsMap.require_selfie_clock_out !== undefined ? (settingsMap.require_selfie_clock_out === true || settingsMap.require_selfie_clock_out === "true") : true,
    enable_break_attendance: settingsMap.enable_break_attendance !== undefined ? (settingsMap.enable_break_attendance === true || settingsMap.enable_break_attendance === "true") : true,
  };

  return apiSuccess({ logs, settings: finalSettings }, "Berhasil memuat histori absensi");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user || !session.user.employeeId) {
    return apiError("UNAUTHORIZED", "Hanya akun karyawan yang dapat melakukan absensi", null, 401);
  }

  const body = await req.json();
  const { action, lat, lng, photo, isManualFallback, isLocationOverride, note } = body;

  if (!action || !["clock_in", "break_out", "break_in", "clock_out"].includes(action)) {
    return apiError("BAD_REQUEST", "Aksi absensi tidak valid");
  }

  if (lat === undefined || lng === undefined) {
    return apiError("BAD_REQUEST", "Koordinat GPS wajib disediakan");
  }

  await connectToDatabase();

  // 1. Fetch require_selfie settings dynamically
  const settingKey = `require_selfie_${action}`;
  const selfieSetting = await Setting.findOne({ key: settingKey });
  const isSelfieRequired = selfieSetting ? (selfieSetting.value === true || selfieSetting.value === "true") : (action === "clock_in" || action === "clock_out");

  if (isSelfieRequired && !photo) {
    return apiError("BAD_REQUEST", "Foto verifikasi wajah selfie wajib disediakan untuk tindakan ini");
  }

  // 2. Fetch Employee Profile details
  const employeeId = session.user.employeeId;
  const employee = await Employee.findById(employeeId).populate("branchId");
  if (!employee) {
    return apiError("NOT_FOUND", "Data karyawan tidak ditemukan");
  }

  const assignedBranch = employee.branchId as any;
  if (!assignedBranch) {
    return apiError("BAD_REQUEST", "Cabang kantor penempatan karyawan belum diset oleh HRD");
  }

  // 3. Validate Geolocation Radius Check
  let activeBranch = assignedBranch;
  let isCrossBranch = false;

  // Calculate distance to assigned branch
  let distance = calculateDistanceMeters(lat, lng, assignedBranch.lat, assignedBranch.lng);
  let isWithinRadius = distance <= assignedBranch.radiusMeter;

  if (!isWithinRadius) {
    // Check if within radius of other office branches (cross-branch check)
    const branches = await Branch.find({ _id: { $ne: assignedBranch._id } });
    for (const br of branches) {
      const d = calculateDistanceMeters(lat, lng, br.lat, br.lng);
      if (d <= br.radiusMeter) {
        activeBranch = br;
        distance = d;
        isWithinRadius = true;
        isCrossBranch = true;
        break;
      }
    }
  }

  // Handle Geofence Rejection
  if (!isWithinRadius && !isLocationOverride) {
    return apiError(
      "GEOFENCE_REJECTED",
      `Absen ditolak. Anda berada di luar radius kantor (${Math.round(distance)} meter dari ${assignedBranch.name}).`
    );
  }

  // 4. Process Photo Upload to Storage Adapter if provided
  let photoUrl = "";
  if (photo) {
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const todayStr = new Date().toISOString().split("T")[0];
    const relativePath = `attendances/${employeeId}/${todayStr}-${action}.jpg`;
    photoUrl = await storageProvider.upload(buffer, relativePath, "image/jpeg");
  }

  // 4. Fetch daily WorkSchedule assignment
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const scheduleAssign = await EmployeeSchedule.findOne({
    employeeId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).populate("scheduleId");

  let clockInScheduleTime = assignedBranch.workHours.start; // fallback to branch default
  let gracePeriod = 0;

  if (scheduleAssign && scheduleAssign.scheduleId) {
    const s = scheduleAssign.scheduleId as any;
    clockInScheduleTime = s.clockIn;
    gracePeriod = s.gracePeriodMinutes || 0;
  } else {
    // Query global grace period setting
    const graceSetting = await Setting.findOne({ key: "grace_period_minutes" });
    if (graceSetting) {
      gracePeriod = graceSetting.value || 0;
    }
  }

  const nowTime = new Date();

  // 5. Determine Lateness
  let isLate = false;
  let lateMinutes = 0;

  if (action === "clock_in") {
    const [schedHour, schedMin] = clockInScheduleTime.split(":").map(Number);
    const schedDate = new Date();
    schedDate.setHours(schedHour, schedMin, 0, 0);

    // Apply grace period
    const schedWithGrace = new Date(schedDate.getTime() + gracePeriod * 60 * 1000);
    
    if (nowTime.getTime() > schedWithGrace.getTime()) {
      isLate = true;
      lateMinutes = Math.round((nowTime.getTime() - schedDate.getTime()) / (60 * 1000));
    }
  }

  // 6. Save/Update Attendance record
  let attendanceRecord = await Attendance.findOne({
    employeeId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (attendanceRecord) {
    // Update existing day entry
    if (action === "clock_in") {
      attendanceRecord.clockIn = nowTime;
      attendanceRecord.isLate = isLate;
      attendanceRecord.lateMinutes = lateMinutes;
    } else if (action === "break_out") {
      attendanceRecord.breakOut = nowTime;
    } else if (action === "break_in") {
      attendanceRecord.breakIn = nowTime;
    } else if (action === "clock_out") {
      attendanceRecord.clockOut = nowTime;
    }
    
    if (photoUrl && !attendanceRecord.photoUrl.includes(photoUrl)) {
      attendanceRecord.photoUrl.push(photoUrl);
    }
    
    attendanceRecord.gpsLat = lat;
    attendanceRecord.gpsLng = lng;
    attendanceRecord.isManualFallback = isManualFallback || attendanceRecord.isManualFallback;
    attendanceRecord.isCrossBranch = isCrossBranch || attendanceRecord.isCrossBranch;
    attendanceRecord.isLocationOverride = isLocationOverride || attendanceRecord.isLocationOverride;
    if (note) attendanceRecord.note = note;
    
    await attendanceRecord.save();
  } else {
    // Create new day entry
    attendanceRecord = await Attendance.create({
      employeeId,
      date: startOfDay,
      clockIn: action === "clock_in" ? nowTime : undefined,
      breakOut: action === "break_out" ? nowTime : undefined,
      breakIn: action === "break_in" ? nowTime : undefined,
      clockOut: action === "clock_out" ? nowTime : undefined,
      photoUrl: photoUrl ? [photoUrl] : [],
      gpsLat: lat,
      gpsLng: lng,
      isLate,
      lateMinutes,
      isManualFallback: !!isManualFallback,
      isCrossBranch: !!isCrossBranch,
      isLocationOverride: !!isLocationOverride,
      note: note || "",
    });
  }

  // 7. Log to AuditLog
  const auditActionMap: Record<string, string> = {
    clock_in: "CLOCK_IN",
    break_out: "BREAK_OUT",
    break_in: "BREAK_IN",
    clock_out: "CLOCK_OUT"
  };

  await logActivity({
    userId: session.user.id,
    action: auditActionMap[action] || "ATTENDANCE_RECORD",
    module: "attendance",
    before: null,
    after: attendanceRecord.toObject(),
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  let msg = "Berhasil mencatat absensi";
  if (action === "clock_in") {
    msg = `Berhasil Absen Masuk${isLate ? ` (Terlambat ${lateMinutes} menit)` : ""}`;
  } else if (action === "break_out") {
    msg = "Berhasil Absen Mulai Istirahat. Selamat beristirahat!";
  } else if (action === "break_in") {
    msg = "Berhasil Absen Selesai Istirahat. Selamat kembali bekerja!";
  } else if (action === "clock_out") {
    msg = "Berhasil Absen Pulang. Hati-hati di jalan!";
  }

  return apiSuccess(attendanceRecord, msg);
});
