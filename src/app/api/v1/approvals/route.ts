import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import ApprovalInstance from "@/models/ApprovalInstance";
import LeaveRequest from "@/models/LeaveRequest";
import LeaveBalance from "@/models/LeaveBalance";
import Employee from "@/models/Employee";
import User from "@/models/User";
import Role from "@/models/Role";
import Attendance from "@/models/Attendance";
import AttendanceCorrection from "@/models/AttendanceCorrection";
import { sendEmail, sendWhatsapp } from "@/lib/notification/notificationService";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  const userRole = session.user.role;
  const userEmpId = session.user.employeeId;

  // Query approval instances that are pending and require user's role approval
  const filter: Record<string, any> = {
    status: "pending",
    "stepsStatus": {
      $elemMatch: {
        status: "pending",
        approverRole: userRole
      }
    }
  };

  const instances = await ApprovalInstance.find(filter)
    .populate("history.userId")
    .sort({ createdAt: -1 });

  // Filter instances by department scope if SPV
  const filtered = [];
  for (const inst of instances) {
    // Determine active step
    const activeStep = inst.stepsStatus.find((s: any) => s.status === "pending");
    if (!activeStep || activeStep.approverRole !== userRole) continue;

    // Fetch original request details to inspect department of submitter
    let requesterDeptId = null;
    let employeeProfile = null;
    let details: any = null;

    if (inst.refType === "leave") {
      const request = await LeaveRequest.findById(inst.refId).populate("employeeId").populate("leaveTypeId");
      if (request && request.employeeId) {
        employeeProfile = request.employeeId as any;
        requesterDeptId = employeeProfile.divisionId?.toString();
        details = {
          startDate: request.startDate,
          endDate: request.endDate,
          leaveTypeName: (request.leaveTypeId as any)?.name || "Izin/Cuti",
          reason: request.reason,
          evidenceUrl: request.evidenceUrl
        };
      }
    } else if (inst.refType === "correction") {
      const request = await AttendanceCorrection.findById(inst.refId).populate("employeeId");
      if (request && request.employeeId) {
        employeeProfile = request.employeeId as any;
        requesterDeptId = employeeProfile.divisionId?.toString();
        details = {
          date: request.date,
          clockInTime: request.clockInTime,
          clockOutTime: request.clockOutTime,
          reasonType: request.reasonType,
          reasonNote: request.reasonNote,
          evidenceUrl: request.evidenceUrl
        };
      }
    }

    if (userRole === "SPV" && requesterDeptId && session.user.divisionId !== requesterDeptId) {
      // SPV can only see approvals within their own division
      continue;
    }

    filtered.push({
      _id: inst._id,
      refType: inst.refType,
      refId: inst.refId,
      currentStep: inst.currentStep,
      status: inst.status,
      requesterName: employeeProfile?.name || "Karyawan",
      requesterNip: employeeProfile?.employeeId || "-",
      createdAt: inst.createdAt,
      steps: inst.stepsStatus,
      details
    });
  }

  return apiSuccess(filtered, "Berhasil memuat antrean persetujuan");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const { instanceId, action, comment } = await req.json(); // action: 'approve' | 'reject'

  if (!instanceId || !action || !["approve", "reject"].includes(action)) {
    return apiError("BAD_REQUEST", "Parameter instanceId dan action ('approve'/'reject') wajib diisi");
  }

  await connectToDatabase();

  const inst = await ApprovalInstance.findById(instanceId);
  if (!inst) {
    return apiError("NOT_FOUND", "Persetujuan tidak ditemukan");
  }

  if (inst.status !== "pending") {
    return apiError("BAD_REQUEST", "Persetujuan ini sudah selesai diproses");
  }

  // Find active step
  const activeStepIdx = inst.stepsStatus.findIndex((s: any) => s.status === "pending" && s.stepNumber === inst.currentStep);
  if (activeStepIdx === -1) {
    return apiError("BAD_REQUEST", "Tidak ada langkah persetujuan yang aktif");
  }

  const activeStep = inst.stepsStatus[activeStepIdx];

  // Verify if current user's role matches active step approver role
  if (session.user.role !== activeStep.approverRole) {
    return apiError("FORBIDDEN", `Langkah ini memerlukan persetujuan peran ${activeStep.approverRole}`, null, 403);
  }

  const now = new Date();
  
  if (action === "reject") {
    // 1. Mark current step as rejected
    inst.stepsStatus[activeStepIdx].status = "rejected";
    inst.stepsStatus[activeStepIdx].actionedBy = session.user.id as any;
    inst.stepsStatus[activeStepIdx].actionedAt = now;
    inst.stepsStatus[activeStepIdx].comment = comment;

    // 2. Mark entire instance as rejected
    inst.status = "rejected";
    inst.history.push({
      action: "REJECTED",
      userId: session.user.id as any,
      timestamp: now,
      comment
    });

    await inst.save();

    // 3. Update referenced request & Notify Employee
    if (inst.refType === "leave") {
      await LeaveRequest.findByIdAndUpdate(inst.refId, { status: "rejected" });
      
      // Return leave balance allocation back (refund days)
      const leaveReq = await LeaveRequest.findById(inst.refId).populate("employeeId");
      if (leaveReq) {
        const diffTime = Math.abs(leaveReq.endDate.getTime() - leaveReq.startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        await LeaveBalance.findOneAndUpdate(
          { employeeId: leaveReq.employeeId, leaveTypeId: leaveReq.leaveTypeId, year: new Date(leaveReq.startDate).getFullYear() },
          { $inc: { pendingDays: -diffDays, remainingDays: diffDays } }
        );

        // Notify submitter employee
        const emp = leaveReq.employeeId as any;
        if (emp) {
          if (emp.personalEmail) {
            sendEmail({
              to: emp.personalEmail,
              subject: "Pengajuan Cuti Anda Ditolak",
              html: `<p>Halo <strong>${emp.name}</strong>,</p><p>Pengajuan cuti Anda telah ditolak oleh peninjau dengan catatan: "${comment || '-'}".</p>`
            }).catch(console.error);
          }
          if (emp.phone) {
            sendWhatsapp({
              to: emp.phone,
              message: `Halo ${emp.name}, pengajuan cuti Anda ditolak dengan catatan: "${comment || '-'}".`
            }).catch(console.error);
          }
        }
      }
    } else if (inst.refType === "correction") {
      await AttendanceCorrection.findByIdAndUpdate(inst.refId, { status: "rejected" });
    }

    await logActivity({
      userId: session.user.id,
      action: "REJECT_APPROVAL",
      module: inst.refType,
      before: null,
      after: inst.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(inst, "Pengajuan berhasil ditolak");
  } else {
    // Action is Approve
    // 1. Mark current step as approved
    inst.stepsStatus[activeStepIdx].status = "approved";
    inst.stepsStatus[activeStepIdx].actionedBy = session.user.id as any;
    inst.stepsStatus[activeStepIdx].actionedAt = now;
    inst.stepsStatus[activeStepIdx].comment = comment;

    inst.history.push({
      action: "APPROVED",
      userId: session.user.id as any,
      timestamp: now,
      comment
    });

    // 2. Check if there are subsequent steps
    const hasNextStep = inst.stepsStatus.some((s: any) => s.stepNumber > inst.currentStep);

    if (hasNextStep) {
      inst.currentStep += 1;
    } else {
      // Complete flow
      inst.status = "approved";
      
      // Update referenced request document to approved
      if (inst.refType === "leave") {
        await LeaveRequest.findByIdAndUpdate(inst.refId, { status: "approved" });
        
        // Finalize leave balance allocation
        const leaveReq = await LeaveRequest.findById(inst.refId);
        if (leaveReq) {
          const diffTime = Math.abs(leaveReq.endDate.getTime() - leaveReq.startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          await LeaveBalance.findOneAndUpdate(
            { employeeId: leaveReq.employeeId, leaveTypeId: leaveReq.leaveTypeId, year: new Date(leaveReq.startDate).getFullYear() },
            { $inc: { pendingDays: -diffDays, usedDays: diffDays } }
          );
        }
      } else if (inst.refType === "correction") {
        await AttendanceCorrection.findByIdAndUpdate(inst.refId, { status: "approved" });
        
        const corr = await AttendanceCorrection.findById(inst.refId);
        if (corr) {
          const targetDate = new Date(corr.date);
          targetDate.setHours(0, 0, 0, 0);

          const [inH, inM] = corr.clockInTime.split(":").map(Number);
          const clockInDate = new Date(targetDate);
          clockInDate.setHours(inH, inM, 0, 0);

          const [outH, outM] = corr.clockOutTime.split(":").map(Number);
          const clockOutDate = new Date(targetDate);
          clockOutDate.setHours(outH, outM, 0, 0);

          await Attendance.findOneAndUpdate(
            { employeeId: corr.employeeId, date: targetDate },
            {
              clockIn: clockInDate,
              clockOut: clockOutDate,
              isLate: false,
              lateMinutes: 0,
              gpsLat: -6.2088,
              gpsLng: 106.8456,
              note: `Koreksi Absen disetujui: ${corr.reasonNote}`
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    await inst.save();

    await logActivity({
      userId: session.user.id,
      action: "APPROVE_APPROVAL",
      module: inst.refType,
      before: null,
      after: inst.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(inst, hasNextStep ? "Berhasil menyetujui langkah. Pengajuan diteruskan ke approver berikutnya." : "Pengajuan disetujui sepenuhnya.");
  }
});
