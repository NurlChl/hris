import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import { storageProvider } from "@/lib/storage";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import Contract from "@/models/Contract";
import Attendance from "@/models/Attendance";
import OvertimeRecord from "@/models/OvertimeRecord";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  const url = new URL(req.url);
  const period = url.searchParams.get("period");

  const filter: Record<string, any> = {};
  if (period) {
    filter.period = period;
  }

  // Submitter scopes
  if (session.user.role === "STAFF") {
    if (!session.user.employeeId) return apiSuccess([]);
    filter.employeeId = session.user.employeeId;
  }

  const payrolls = await Payroll.find(filter)
    .populate("employeeId")
    .populate("generatedBy")
    .sort({ createdAt: -1 });

  return apiSuccess(payrolls, "Berhasil memuat data slip gaji");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "payroll", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi payroll", null, 403);
  }

  const body = await req.json();
  const { period, employeeIds } = body; // period: "2026-07"

  if (!period || !Array.isArray(employeeIds)) {
    return apiError("BAD_REQUEST", "Data period (yyyy-mm) dan employeeIds (array) wajib disediakan");
  }

  await connectToDatabase();

  const results = [];
  const errors = [];

  for (const empId of employeeIds) {
    try {
      const employee = await Employee.findById(empId);
      if (!employee) {
        errors.push({ id: empId, message: "Karyawan tidak ditemukan" });
        continue;
      }

      // 1. Fetch Salary details from Active Contract
      const contract = await Contract.findOne({ employeeId: empId, status: "active" });
      const basicSalary = contract ? contract.salarySnapshot.basicSalary : 3500000; // fallback to default
      const allowancesAmount = contract ? contract.salarySnapshot.allowances : 500000;

      // 2. Calculate Tardiness Penalties from Attendance
      const startOfMonth = new Date(`${period}-01`);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59);

      const attendanceLogs = await Attendance.find({
        employeeId: empId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      let lateMinutes = 0;
      let latePenalties = 0;
      for (const log of attendanceLogs) {
        if (log.isLate) {
          lateMinutes += log.lateMinutes;
        }
      }
      // Late penalty: 5,000 IDR per minute
      latePenalties = lateMinutes * 5000;

      // 3. Calculate Overtime earnings
      const approvedOvertimes = await OvertimeRecord.find({
        employeeId: empId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        status: "approved"
      });

      let overtimeHours = 0;
      for (const ot of approvedOvertimes) {
        overtimeHours += ot.hours;
      }
      // Overtime earning: 25,000 IDR per hour
      const overtimeSalary = overtimeHours * 25000;

      // 4. Calculate BPJS contributions (standard simple rule)
      const bpjsKesehatan = Math.round(basicSalary * 0.01);
      const bpjsKetenagakerjaan = Math.round(basicSalary * 0.02);

      // 5. Calculate PPh 21 Tax (simplified rule: 5% of net salary if above 4,500,000)
      const taxableBase = basicSalary + allowancesAmount + overtimeSalary - latePenalties - bpjsKesehatan - bpjsKetenagakerjaan;
      const taxAmount = taxableBase > 4500000 ? Math.round(taxableBase * 0.05) : 0;

      // Deductions and Allowances collections
      const allowances = [{ name: "Tunjangan Jabatan", amount: allowancesAmount }];
      const deductions = [
        { name: "Potongan Telat", amount: latePenalties },
        { name: "BPJS Kesehatan (1%)", amount: bpjsKesehatan },
        { name: "BPJS Ketenagakerjaan (2%)", amount: bpjsKetenagakerjaan },
        { name: "Pajak PPh 21", amount: taxAmount }
      ];

      const totalEarnings = basicSalary + allowancesAmount + overtimeSalary;
      const totalDeductions = latePenalties + bpjsKesehatan + bpjsKetenagakerjaan + taxAmount;
      const netSalary = totalEarnings - totalDeductions;

      // 6. Generate Slip HTML document and upload
      const slipHtml = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .section { margin: 20px 0; }
              .row { display: flex; justify-content: space-between; margin: 8px 0; }
              .total { font-weight: bold; border-top: 1px solid #ddd; padding-top: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>SLIP GAJI KARYAWAN</h2>
              <p>Periode: ${period}</p>
            </div>
            <div class="section">
              <p><strong>NIP:</strong> ${employee.employeeId}</p>
              <p><strong>Nama:</strong> ${employee.name}</p>
            </div>
            <div class="section">
              <h4>PENGHASILAN</h4>
              <div class="row"><span>Gaji Pokok</span><span>Rp ${basicSalary.toLocaleString()}</span></div>
              <div class="row"><span>Tunjangan</span><span>Rp ${allowancesAmount.toLocaleString()}</span></div>
              <div class="row"><span>Lembur</span><span>Rp ${overtimeSalary.toLocaleString()}</span></div>
              <div class="row total"><span>Total Penghasilan</span><span>Rp ${totalEarnings.toLocaleString()}</span></div>
            </div>
            <div class="section">
              <h4>POTONGAN</h4>
              <div class="row"><span>Potongan Telat (${lateMinutes}m)</span><span>Rp ${latePenalties.toLocaleString()}</span></div>
              <div class="row"><span>BPJS Kesehatan</span><span>Rp ${bpjsKesehatan.toLocaleString()}</span></div>
              <div class="row"><span>BPJS Ketenagakerjaan</span><span>Rp ${bpjsKetenagakerjaan.toLocaleString()}</span></div>
              <div class="row"><span>Pajak PPh 21</span><span>Rp ${taxAmount.toLocaleString()}</span></div>
              <div class="row total"><span>Total Potongan</span><span>Rp ${totalDeductions.toLocaleString()}</span></div>
            </div>
            <div class="section">
              <div class="row total" style="font-size: 18px; border-top: 2px solid #333; padding-top: 12px;">
                <span>GAJI BERSIH (NET)</span>
                <span>Rp ${netSalary.toLocaleString()}</span>
              </div>
            </div>
          </body>
        </html>
      `;

      const slipBuffer = Buffer.from(slipHtml, "utf-8");
      const relativePath = `payrolls/${empId}/${period}.html`;
      const fileUrl = await storageProvider.upload(slipBuffer, relativePath, "text/html");

      // Save/Upsert payroll record
      const payroll = await Payroll.findOneAndUpdate(
        { employeeId: empId, period },
        {
          basicSalary,
          incentives: 0,
          allowances,
          deductions,
          overtimeSalary,
          totalEarnings,
          totalDeductions,
          netSalary,
          fileUrl,
          generatedBy: session.user.id,
          status: "published",
        },
        { new: true, upsert: true }
      );

      results.push(payroll);
    } catch (err: any) {
      errors.push({ id: empId, message: err.message });
    }
  }

  // Log to AuditLog
  await logActivity({
    userId: session.user.id,
    action: "GENERATE_PAYROLL",
    module: "payroll",
    before: null,
    after: { period, generatedCount: results.length, errors },
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  return apiSuccess({ results, errors }, `Selesai memproses payroll. Sukses: ${results.length}, Gagal: ${errors.length}`);
});
