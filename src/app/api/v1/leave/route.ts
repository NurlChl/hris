import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { logActivity } from "@/lib/audit/logger";
import LeaveType from "@/models/LeaveType";
import LeaveBalance from "@/models/LeaveBalance";
import LeaveRequest from "@/models/LeaveRequest";
import ApprovalFlow from "@/models/ApprovalFlow";
import ApprovalInstance from "@/models/ApprovalInstance";
import Employee from "@/models/Employee";
import User from "@/models/User";
import Role from "@/models/Role";
import { sendEmail, sendWhatsapp } from "@/lib/notification/notificationService";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "balance";

  if (type === "types") {
    const leaveTypes = await LeaveType.find({});
    return apiSuccess(leaveTypes, "Berhasil memuat jenis cuti");
  } else {
    // Fetch remaining balances
    const empId = session.user.employeeId;
    if (!empId) {
      return apiSuccess([], "Berhasil memuat saldo");
    }

    const year = new Date().getFullYear();
    
    // Auto-initialize balance if doesn't exist yet for active leave types
    const leaveTypes = await LeaveType.find({});
    for (const lt of leaveTypes) {
      const balanceExists = await LeaveBalance.findOne({
        employeeId: empId,
        leaveTypeId: lt._id,
        year
      });
      if (!balanceExists) {
        await LeaveBalance.create({
          employeeId: empId,
          leaveTypeId: lt._id,
          year,
          allocatedDays: lt.quotaDays,
          remainingDays: lt.quotaDays,
          usedDays: 0,
          pendingDays: 0
        });
      }
    }

    const balances = await LeaveBalance.find({ employeeId: empId, year })
      .populate("leaveTypeId");

    // Also fetch historical requests
    const history = await LeaveRequest.find({ employeeId: empId })
      .populate("leaveTypeId")
      .sort({ createdAt: -1 });

    return apiSuccess({ balances, history }, "Berhasil memuat data cuti");
  }
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user || !session.user.employeeId) {
    return apiError("UNAUTHORIZED", "Hanya akun karyawan yang dapat mengajukan cuti", null, 401);
  }

  const body = await req.json();
  const { leaveTypeId, startDate, endDate, reason, evidenceUrl } = body;

  if (!leaveTypeId || !startDate || !endDate || !reason) {
    return apiError("BAD_REQUEST", "Data jenis cuti, tanggal mulai, tanggal selesai, dan alasan wajib disediakan");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start.getTime() > end.getTime()) {
    return apiError("BAD_REQUEST", "Tanggal selesai tidak boleh sebelum tanggal mulai");
  }

  await connectToDatabase();

  const employeeId = session.user.employeeId;
  const year = start.getFullYear();

  // 1. Fetch Leave Type Details
  const lt = await LeaveType.findById(leaveTypeId);
  if (!lt) {
    return apiError("NOT_FOUND", "Jenis cuti tidak ditemukan");
  }

  // 2. Validate Notice Lead Time (H- lead days check)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTimeNotice = start.getTime() - today.getTime();
  const diffDaysNotice = Math.ceil(diffTimeNotice / (1000 * 60 * 60 * 24));
  
  if (diffDaysNotice < lt.minLeadDays) {
    return apiError(
      "LEAD_TIME_VIOLATION",
      `Pengajuan jenis cuti ini minimal harus diajukan H-${lt.minLeadDays} sebelum tanggal mulai.`
    );
  }

  // 3. Calculate leave duration
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

  // 4. Verify Leave Balance Availability
  const balance = await LeaveBalance.findOne({
    employeeId,
    leaveTypeId,
    year
  });

  if (!balance || balance.remainingDays < diffDays) {
    return apiError(
      "INSUFFICIENT_BALANCE",
      `Saldo cuti tidak mencukupi. Sisa saldo Anda: ${balance?.remainingDays || 0} hari. Pengajuan: ${diffDays} hari.`
    );
  }

  // 5. Create LeaveRequest document
  const leaveReq = await LeaveRequest.create({
    employeeId,
    leaveTypeId,
    startDate: start,
    endDate: end,
    reason,
    evidenceUrl: evidenceUrl || "",
    status: "pending",
  });

  // 6. Look up and trigger Approval Flow
  const flow = await ApprovalFlow.findOne({ transactionType: "leave" });
  let approvalInstanceId;

  if (flow) {
    // Generate approval instance stepsStatus mapping
    const stepsStatus = flow.steps.map((step: any) => ({
      stepNumber: step.stepNumber,
      approverRole: step.approverRole,
      status: step.stepNumber === 1 ? "pending" : "pending", // will evaluate in order
    }));

    const inst = await ApprovalInstance.create({
      refType: "leave",
      refId: leaveReq._id,
      currentStep: 1,
      status: "pending",
      stepsStatus,
      history: [
        {
          action: "SUBMITTED",
          userId: session.user.id as any,
          timestamp: new Date(),
          comment: "Mengajukan cuti"
        }
      ]
    });

    approvalInstanceId = inst._id;
    leaveReq.approvalInstanceId = inst._id as any;
    await leaveReq.save();

    // Trigger Notification to next approver
    try {
      const employee = await Employee.findById(employeeId);
      const targetRoleName = stepsStatus[0].approverRole;
      const targetRole = await Role.findOne({ name: targetRoleName });
      if (targetRole && employee) {
        const approvers = await User.find({ roleId: targetRole._id });
        for (const app of approvers) {
          if (app.email) {
            sendEmail({
              to: app.email,
              subject: "Persetujuan Pengajuan Cuti Baru",
              html: `<p>Halo,</p><p>Karyawan <strong>${employee.name}</strong> mengajukan cuti (${lt.name}) dari tanggal ${startDate} s/d ${endDate} dengan alasan: "${reason}".</p><p>Silakan login ke portal admin untuk menyetujui.</p>`
            }).catch(console.error);
          }
          if (app.phone) {
            sendWhatsapp({
              to: app.phone,
              message: `Halo, pengajuan cuti baru dari ${employee.name} (${lt.name}) membutuhkan persetujuan Anda.`
            }).catch(console.error);
          }
        }
      }
    } catch (nErr) {
      console.error("Gagal mengirim notifikasi pengajuan cuti:", nErr);
    }
  }

  // 7. Lock balances (decrement remaining, increment pending)
  balance.remainingDays -= diffDays;
  balance.pendingDays += diffDays;
  await balance.save();

  // 8. Log audit log
  await logActivity({
    userId: session.user.id,
    action: "CREATE_LEAVE_REQUEST",
    module: "leave",
    before: null,
    after: leaveReq.toObject(),
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  return apiSuccess(leaveReq, `Pengajuan cuti berhasil disubmit. Menunggu persetujuan.`);
});
