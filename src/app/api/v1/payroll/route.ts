import { z } from "zod";
import mongoose from "mongoose";
import { wrapRouteHandler, apiSuccess } from "@/lib/api";
import {
  requireUser,
  requirePermission,
  parseBody,
  scopeFilter,
  BadRequest,
  Forbidden,
  pagination,
} from "@/lib/guard";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import { storageProvider } from "@/lib/storage";
import { getSettings } from "@/lib/settings";
import { holidayMap } from "@/lib/hr/calendar";
import {
  eachDayKey,
  formatPeriod,
  formatRupiah,
  isWeekendKey,
  wibDateKey,
  wibEndOfMonth,
  wibPeriodKey,
  wibStartOfMonth,
} from "@/lib/time";
import { escapeHtml } from "@/lib/notification/notify";
import { notifyUsers, resolveRecipientForEmployee } from "@/lib/notification/notify";
import Payroll from "@/models/Payroll";
import Employee from "@/models/Employee";
import Contract from "@/models/Contract";
import Attendance from "@/models/Attendance";
import OvertimeRecord from "@/models/OvertimeRecord";
import LeaveRequest from "@/models/LeaveRequest";

/* ------------------------------------------------------------------ */
/* GET                                                                  */
/* ------------------------------------------------------------------ */

export const GET = wrapRouteHandler(async (req) => {
  const ctx = await requireUser(req);
  const sp = new URL(req.url).searchParams;
  const period = sp.get("period");
  const { page, limit, skip } = pagination(req, 25, 100);

  const perm = await checkPermission(ctx.user.id, "payroll", "read");

  const filter: Record<string, unknown> = {};
  if (period) filter.period = period;

  // Anything other than an explicit company-wide read scope is pinned to the
  // caller's own record. The previous version only pinned the literal "STAFF"
  // role, so any custom role could read every payslip in the company.
  if (!perm.allowed || perm.scope !== "all") {
    if (!ctx.user.employeeId) {
      return apiSuccess([], "Akun ini tidak tertaut ke data karyawan");
    }
    Object.assign(filter, scopeFilter({ ...ctx, permission: perm }));
    if (perm.scope === "self" || !perm.allowed) filter.employeeId = ctx.user.employeeId;
    // Employees only see published slips, never in-progress drafts.
    filter.status = "published";
  }

  const [payrolls, total] = await Promise.all([
    Payroll.find(filter)
      .populate("employeeId", "name employeeId divisionId branchId")
      .populate("generatedBy", "email")
      .sort({ period: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payroll.countDocuments(filter),
  ]);

  // The slip file itself is only ever handed over as a short-lived signed link.
  const withLinks = await Promise.all(
    payrolls.map(async (p) => ({
      ...p,
      fileUrl: p.fileUrl ? await storageProvider.getSignedUrl(p.fileUrl as string, 900) : "",
    }))
  );

  return apiSuccess(withLinks, "Berhasil memuat data slip gaji", { page, limit, total });
});

/* ------------------------------------------------------------------ */
/* POST — generate                                                      */
/* ------------------------------------------------------------------ */

const generateSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berformat YYYY-MM"),
  employeeIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1, "Pilih minimal satu karyawan"),
  /** Draft lets Finance review numbers before employees can see them. */
  publish: z.boolean().default(true),
});

export const POST = wrapRouteHandler(async (req) => {
  const ctx = await requirePermission(req, "payroll", "write");
  const body = await parseBody(req, generateSchema);

  if (body.period > wibPeriodKey()) {
    throw BadRequest("Periode payroll tidak boleh melebihi bulan berjalan.");
  }
  if (body.employeeIds.length > 500) {
    throw BadRequest("Maksimal 500 karyawan per proses. Bagi menjadi beberapa batch.");
  }

  const settings = await getSettings();
  const rates = {
    latePerMinute: Number(settings.payroll_late_penalty_per_minute),
    latePenaltyCap: Number(settings.payroll_late_penalty_cap),
    overtimePerHour: Number(settings.payroll_overtime_rate_per_hour),
    absentPerDay: Number(settings.payroll_absent_penalty_per_day),
    bpjsKesPct: Number(settings.payroll_bpjs_kesehatan_pct),
    bpjsTkPct: Number(settings.payroll_bpjs_tk_pct),
    pph21Pct: Number(settings.payroll_pph21_pct),
    pph21Threshold: Number(settings.payroll_pph21_threshold),
    defaultBasic: Number(settings.payroll_default_basic_salary),
  };
  const companyName = String(settings.company_name);
  const companyAddress = String(settings.company_address);

  const monthStart = wibStartOfMonth(body.period);
  const monthEnd = wibEndOfMonth(body.period);
  const dayKeys = eachDayKey(monthStart, monthEnd);
  const holidays = await holidayMap(dayKeys[0], dayKeys[dayKeys.length - 1]);

  // Working days in the period, used for the alpha (absent) calculation.
  const workingDayKeys = dayKeys.filter((k) => !isWeekendKey(k) && !holidays.has(k));
  // Only days that have already happened can count as absences.
  const todayKey = wibDateKey();
  const elapsedWorkingDays = workingDayKeys.filter((k) => k <= todayKey);

  const results: unknown[] = [];
  const errors: Array<{ id: string; name?: string; message: string }> = [];

  for (const empId of body.employeeIds) {
    try {
      const employee = await Employee.findById(empId)
        .select("name employeeId taxStatus")
        .lean<{ _id: mongoose.Types.ObjectId; name: string; employeeId: string; taxStatus?: string } | null>();
      if (!employee) {
        errors.push({ id: empId, message: "Karyawan tidak ditemukan" });
        continue;
      }

      /* --- salary base ---------------------------------------------- */
      const contract = await Contract.findOne({ employeeId: empId, status: "active" })
        .sort({ startDate: -1 })
        .lean<{ salarySnapshot?: { basicSalary?: number; allowances?: number } } | null>();

      const basicSalary = contract?.salarySnapshot?.basicSalary ?? rates.defaultBasic;
      const allowancesAmount = contract?.salarySnapshot?.allowances ?? 0;

      if (!contract && rates.defaultBasic === 0) {
        errors.push({
          id: empId,
          name: employee.name,
          message:
            "Belum ada kontrak aktif dengan nominal gaji, dan gaji pokok default belum diatur di Pengaturan Payroll.",
        });
        continue;
      }

      /* --- attendance ------------------------------------------------ */
      const logs = await Attendance.find({
        employeeId: empId,
        date: { $gte: monthStart, $lte: monthEnd },
      }).lean<Array<{ date: Date; isLate: boolean; lateMinutes: number }>>();

      const presentKeys = new Set(logs.map((l) => wibDateKey(new Date(l.date))));
      const lateMinutes = logs.reduce((sum, l) => sum + (l.isLate ? l.lateMinutes || 0 : 0), 0);

      let latePenalty = lateMinutes * rates.latePerMinute;
      if (rates.latePenaltyCap > 0) latePenalty = Math.min(latePenalty, rates.latePenaltyCap);

      /* --- absences (alpha) ------------------------------------------ */
      // A working day with no attendance is only "alpha" if it is not covered
      // by an approved leave — otherwise approved leave would be fined.
      const approvedLeaves = await LeaveRequest.find({
        employeeId: empId,
        status: "approved",
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      }).lean<Array<{ startDate: Date; endDate: Date }>>();

      const leaveKeys = new Set<string>();
      for (const lv of approvedLeaves) {
        for (const k of eachDayKey(lv.startDate, lv.endDate)) leaveKeys.add(k);
      }

      const absentKeys = elapsedWorkingDays.filter(
        (k) => !presentKeys.has(k) && !leaveKeys.has(k)
      );
      const absentPenalty = absentKeys.length * rates.absentPerDay;

      /* --- overtime --------------------------------------------------- */
      const overtimes = await OvertimeRecord.find({
        employeeId: empId,
        date: { $gte: monthStart, $lte: monthEnd },
        status: "approved",
      }).lean<Array<{ hours: number }>>();
      const overtimeHours = overtimes.reduce((s, o) => s + (o.hours || 0), 0);
      const overtimePay = Math.round(overtimeHours * rates.overtimePerHour);

      /* --- statutory deductions --------------------------------------- */
      const bpjsKesehatan = Math.round((basicSalary * rates.bpjsKesPct) / 100);
      const bpjsKetenagakerjaan = Math.round((basicSalary * rates.bpjsTkPct) / 100);

      const gross = basicSalary + allowancesAmount + overtimePay;
      const preTaxDeductions = latePenalty + absentPenalty + bpjsKesehatan + bpjsKetenagakerjaan;
      const taxableBase = gross - preTaxDeductions;
      // Only the portion above the PTKP threshold is taxed — the previous
      // version taxed the entire amount once the threshold was crossed, which
      // created a cliff where earning Rp 1 more cost Rp 225.000 in tax.
      const taxAmount =
        taxableBase > rates.pph21Threshold
          ? Math.round(((taxableBase - rates.pph21Threshold) * rates.pph21Pct) / 100)
          : 0;

      const allowanceLines = allowancesAmount > 0 ? [{ name: "Tunjangan", amount: allowancesAmount }] : [];
      const deductionLines = [
        { name: `Potongan keterlambatan (${lateMinutes} menit)`, amount: latePenalty },
        { name: `Potongan alpha (${absentKeys.length} hari)`, amount: absentPenalty },
        { name: `BPJS Kesehatan (${rates.bpjsKesPct}%)`, amount: bpjsKesehatan },
        { name: `BPJS Ketenagakerjaan (${rates.bpjsTkPct}%)`, amount: bpjsKetenagakerjaan },
        { name: `PPh 21 (${rates.pph21Pct}%)`, amount: taxAmount },
      ].filter((d) => d.amount > 0);

      const totalDeductions = deductionLines.reduce((s, d) => s + d.amount, 0);
      const netSalary = gross - totalDeductions;

      /* --- slip document ---------------------------------------------- */
      const slipHtml = renderSlip({
        companyName,
        companyAddress,
        period: body.period,
        employeeName: employee.name,
        nip: employee.employeeId,
        taxStatus: employee.taxStatus ?? "-",
        basicSalary,
        overtimePay,
        overtimeHours,
        allowanceLines,
        deductionLines,
        gross,
        totalDeductions,
        netSalary,
        presentDays: presentKeys.size,
        workingDays: workingDayKeys.length,
        absentDays: absentKeys.length,
        leaveDays: leaveKeys.size,
      });

      const fileKey = await storageProvider.upload(
        Buffer.from(slipHtml, "utf-8"),
        `payrolls/${empId}/${body.period}.html`,
        "text/html"
      );

      const payroll = await Payroll.findOneAndUpdate(
        { employeeId: empId, period: body.period },
        {
          basicSalary,
          incentives: 0,
          allowances: allowanceLines,
          deductions: deductionLines,
          overtimeSalary: overtimePay,
          overtimeHours,
          lateMinutes,
          absentDays: absentKeys.length,
          presentDays: presentKeys.size,
          workingDays: workingDayKeys.length,
          totalEarnings: gross,
          totalDeductions,
          netSalary,
          fileUrl: fileKey,
          generatedBy: ctx.user.id,
          generatedAt: new Date(),
          status: body.publish ? "published" : "draft",
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (body.publish) {
        const recipients = await resolveRecipientForEmployee(empId);
        void notifyUsers(recipients, {
          kind: "payroll",
          title: `Slip gaji ${formatPeriod(body.period)} sudah terbit`,
          body: `Gaji bersih Anda periode ${formatPeriod(body.period)} sebesar ${formatRupiah(netSalary)}. Buka portal untuk melihat rinciannya.`,
          href: "/portal/payroll",
        });
      }

      results.push(payroll);
    } catch (err) {
      errors.push({ id: empId, message: (err as Error).message });
    }
  }

  void logActivity({
    userId: ctx.user.id,
    action: "GENERATE_PAYROLL",
    module: "payroll",
    after: { period: body.period, generated: results.length, failed: errors.length, rates },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return apiSuccess(
    { results, errors },
    errors.length
      ? `${results.length} slip gaji berhasil dibuat, ${errors.length} gagal. Periksa daftar kegagalan.`
      : `${results.length} slip gaji periode ${formatPeriod(body.period)} berhasil dibuat.`
  );
});

/* ------------------------------------------------------------------ */
/* DELETE — remove a draft                                              */
/* ------------------------------------------------------------------ */

export const DELETE = wrapRouteHandler(async (req) => {
  const ctx = await requirePermission(req, "payroll", "delete");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw BadRequest("ID slip gaji wajib disertakan.");

  const payroll = await Payroll.findById(id);
  if (!payroll) throw BadRequest("Slip gaji tidak ditemukan.");
  if (payroll.status === "published") {
    throw Forbidden(
      "Slip gaji yang sudah terbit tidak dapat dihapus demi jejak audit. Terbitkan revisi dengan menghasilkan ulang periode tersebut."
    );
  }

  if (payroll.fileUrl) await storageProvider.delete(payroll.fileUrl).catch(() => {});
  await payroll.deleteOne();

  void logActivity({
    userId: ctx.user.id,
    action: "DELETE_PAYROLL_DRAFT",
    module: "payroll",
    before: payroll.toObject(),
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return apiSuccess({ id }, "Draf slip gaji dihapus.");
});

/* ------------------------------------------------------------------ */
/* Slip rendering                                                       */
/* ------------------------------------------------------------------ */

interface SlipData {
  companyName: string;
  companyAddress: string;
  period: string;
  employeeName: string;
  nip: string;
  taxStatus: string;
  basicSalary: number;
  overtimePay: number;
  overtimeHours: number;
  allowanceLines: Array<{ name: string; amount: number }>;
  deductionLines: Array<{ name: string; amount: number }>;
  gross: number;
  totalDeductions: number;
  netSalary: number;
  presentDays: number;
  workingDays: number;
  absentDays: number;
  leaveDays: number;
}

/** Self-contained printable slip. All interpolated values are escaped. */
function renderSlip(d: SlipData): string {
  const row = (label: string, amount: number, strong = false) =>
    `<tr${strong ? ' class="strong"' : ""}><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(
      formatRupiah(amount)
    )}</td></tr>`;

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Slip Gaji ${escapeHtml(d.employeeName)} — ${escapeHtml(formatPeriod(d.period))}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Segoe UI",Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:32px;background:#f6f7f9}
  .sheet{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e3e7ed;border-radius:12px;padding:36px}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #0f172a;padding-bottom:18px;margin-bottom:24px}
  h1{margin:0;font-size:18px;letter-spacing:.02em}
  .muted{color:#55637a;font-size:12px;line-height:1.6;margin:4px 0 0}
  .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;margin-bottom:26px;font-size:13px}
  .meta div span{color:#55637a;display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#55637a;margin:24px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:7px 0;border-bottom:1px solid #eef0f4}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .strong td{font-weight:700;border-top:1px solid #cfd6e0;border-bottom:none}
  .net{margin-top:26px;padding:16px 20px;background:#e8efff;border-radius:10px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:16px}
  footer{margin-top:28px;font-size:11px;color:#7b8798;line-height:1.7;border-top:1px solid #eef0f4;padding-top:14px}
  @media print{body{background:#fff;padding:0}.sheet{border:none;border-radius:0}}
</style></head>
<body><div class="sheet">
  <header>
    <div>
      <h1>SLIP GAJI KARYAWAN</h1>
      <p class="muted">Periode ${escapeHtml(formatPeriod(d.period))}</p>
    </div>
    <div style="text-align:right">
      <strong style="font-size:13px">${escapeHtml(d.companyName)}</strong>
      <p class="muted">${escapeHtml(d.companyAddress)}</p>
    </div>
  </header>

  <div class="meta">
    <div><span>Nama Karyawan</span>${escapeHtml(d.employeeName)}</div>
    <div><span>NIP</span>${escapeHtml(d.nip)}</div>
    <div><span>Status Pajak</span>${escapeHtml(d.taxStatus)}</div>
    <div><span>Kehadiran</span>${d.presentDays} dari ${d.workingDays} hari kerja${
      d.leaveDays ? ` · ${d.leaveDays} hari cuti` : ""
    }${d.absentDays ? ` · ${d.absentDays} hari alpha` : ""}</div>
  </div>

  <h2>Penghasilan</h2>
  <table>
    ${row("Gaji Pokok", d.basicSalary)}
    ${d.allowanceLines.map((a) => row(a.name, a.amount)).join("")}
    ${d.overtimePay > 0 ? row(`Lembur (${d.overtimeHours} jam)`, d.overtimePay) : ""}
    ${row("Total Penghasilan", d.gross, true)}
  </table>

  <h2>Potongan</h2>
  <table>
    ${d.deductionLines.length ? d.deductionLines.map((x) => row(x.name, x.amount)).join("") : '<tr><td colspan="2" style="color:#7b8798">Tidak ada potongan pada periode ini.</td></tr>'}
    ${row("Total Potongan", d.totalDeductions, true)}
  </table>

  <div class="net"><span>GAJI BERSIH DITERIMA</span><span>${escapeHtml(formatRupiah(d.netSalary))}</span></div>

  <footer>
    Dokumen ini dihasilkan otomatis oleh sistem HRIS dan sah tanpa tanda tangan basah.
    Bila terdapat selisih perhitungan, ajukan keberatan ke HRD paling lambat 7 hari sejak slip diterbitkan.
    Dilarang menyebarluaskan dokumen ini kepada pihak yang tidak berkepentingan.
  </footer>
</div></body></html>`;
}
