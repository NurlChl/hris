import { z } from "zod";
import mongoose from "mongoose";
import { wrapRouteHandler, apiSuccess } from "@/lib/api";
import {
  requirePermission,
  parseBody,
  BadRequest,
  Conflict,
  NotFound,
} from "@/lib/guard";
import { logActivity } from "@/lib/audit/logger";
import { storageProvider, decodeDataUrl } from "@/lib/storage";
import { getSettings } from "@/lib/settings";
import { notifyUsers, resolveRecipientsByRole } from "@/lib/notification/notify";
import Candidate from "@/models/Candidate";
import CandidateStageHistory from "@/models/CandidateStageHistory";
import JobVacancy from "@/models/JobVacancy";
import Employee from "@/models/Employee";
import User from "@/models/User";
import Counter from "@/models/Counter";
import bcrypt from "bcryptjs";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID tidak valid");

/* ------------------------------------------------------------------ */
/* POST — add a candidate by hand                                       */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  vacancyId: objectId,
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{8,20}$/, "Nomor telepon tidak valid"),
  coverLetter: z.string().trim().max(3000).optional(),
  portfolioUrl: z.string().trim().max(300).optional(),
  cv: z.string().optional(),
});

export const POST = wrapRouteHandler(async (req) => {
  const ctx = await requirePermission(req, "recruitment", "write");
  const body = await parseBody(req, createSchema);

  const vacancy = await JobVacancy.findById(body.vacancyId).lean<{
    _id: mongoose.Types.ObjectId;
    title: string;
    stages?: string[];
    positionId?: mongoose.Types.ObjectId;
  } | null>();
  if (!vacancy) throw NotFound("Lowongan tidak ditemukan.");

  const duplicate = await Candidate.findOne({ email: body.email, vacancyId: vacancy._id }).lean();
  if (duplicate) {
    throw Conflict(`${body.email} sudah terdaftar sebagai pelamar pada lowongan ini.`);
  }

  let cvKey = "";
  if (body.cv) {
    const { buffer, ext, mime } = decodeDataUrl(body.cv, [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);
    cvKey = await storageProvider.upload(
      buffer,
      `candidates/${String(vacancy._id)}/${Date.now()}${ext}`,
      mime
    );
  }

  const firstStage = vacancy.stages?.[0] ?? "Lamaran Masuk";
  const candidate = await Candidate.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    vacancyId: vacancy._id,
    positionId: vacancy.positionId ?? null,
    source: "manual",
    currentStage: firstStage,
    status: "pending",
    cvUrl: cvKey,
    coverLetter: body.coverLetter ?? "",
    portfolioUrl: body.portfolioUrl ?? "",
  });

  await CandidateStageHistory.create({
    candidateId: candidate._id,
    stage: firstStage,
    status: "pending",
    notes: "Ditambahkan manual oleh tim rekrutmen",
  });

  void JobVacancy.updateOne({ _id: vacancy._id }, { $inc: { applicantCount: 1 } }).catch(() => {});

  void logActivity({
    userId: ctx.user.id,
    action: "CREATE_CANDIDATE",
    module: "recruitment",
    after: { name: body.name, vacancy: vacancy.title },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return apiSuccess(candidate, `${body.name} ditambahkan ke tahap "${firstStage}".`, undefined, 201);
});

/* ------------------------------------------------------------------ */
/* PATCH — move stage, record an outcome, schedule an interview         */
/* ------------------------------------------------------------------ */

const moveSchema = z.object({
  id: objectId,
  stage: z.string().trim().min(2).max(60).optional(),
  status: z.enum(["pending", "in_progress", "passed", "rejected", "on_hold"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  rejectionReason: z.string().trim().max(600).optional(),
  offeringSalary: z.number().int().min(0).optional(),
  interviewerId: z.union([objectId, z.literal("")]).optional(),
  scheduledAt: z.string().optional().nullable(),
});

export const PATCH = wrapRouteHandler(async (req) => {
  const ctx = await requirePermission(req, "recruitment", "write");
  const body = await parseBody(req, moveSchema);

  const candidate = await Candidate.findById(body.id);
  if (!candidate) throw NotFound("Pelamar tidak ditemukan.");

  if (!body.stage && !body.status && !body.notes && body.offeringSalary === undefined) {
    throw BadRequest("Tidak ada perubahan yang dikirim.");
  }

  // A stage must exist on the vacancy, otherwise the candidate lands in a
  // column the board cannot render.
  if (body.stage && candidate.vacancyId) {
    const vacancy = await JobVacancy.findById(candidate.vacancyId).lean<{ stages?: string[] } | null>();
    if (vacancy?.stages?.length && !vacancy.stages.includes(body.stage)) {
      throw BadRequest(`Tahap "${body.stage}" tidak terdaftar pada lowongan ini.`);
    }
  }

  if (body.status === "rejected" && !body.rejectionReason?.trim()) {
    throw BadRequest(
      "Alasan penolakan wajib diisi agar keputusan dapat ditelusuri kembali di kemudian hari."
    );
  }

  const before = { stage: candidate.currentStage, status: candidate.status };

  if (body.stage) candidate.currentStage = body.stage;
  if (body.status) candidate.status = body.status;
  if (body.rejectionReason !== undefined) candidate.rejectionReason = body.rejectionReason;
  if (body.offeringSalary !== undefined) candidate.offeringSalary = body.offeringSalary;
  await candidate.save();

  await CandidateStageHistory.create({
    candidateId: candidate._id,
    stage: candidate.currentStage,
    status: candidate.status,
    notes: body.notes ?? (body.status === "rejected" ? body.rejectionReason : ""),
    interviewerId: body.interviewerId || undefined,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
  });

  void logActivity({
    userId: ctx.user.id,
    action: "UPDATE_CANDIDATE_STAGE",
    module: "recruitment",
    before,
    after: { stage: candidate.currentStage, status: candidate.status },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return apiSuccess(
    { id: candidate._id, stage: candidate.currentStage, status: candidate.status },
    body.status === "rejected"
      ? `${candidate.name} ditandai tidak lolos. Datanya tetap tersimpan sebagai riwayat.`
      : `${candidate.name} dipindahkan ke tahap "${candidate.currentStage}".`
  );
});

/* ------------------------------------------------------------------ */
/* PUT — hire: turn an accepted candidate into an employee              */
/* ------------------------------------------------------------------ */

const hireSchema = z.object({
  id: objectId,
  branchId: objectId,
  divisionId: objectId,
  positionId: objectId,
  joinDate: z.string().min(8),
  officeEmail: z.string().trim().toLowerCase().email("Email kantor tidak valid"),
  employmentStatus: z.enum(["probation", "pkwt", "pkwtt", "outsource"]).default("probation"),
  roleId: z.union([objectId, z.literal("")]).optional(),
});

export const PUT = wrapRouteHandler(async (req) => {
  const ctx = await requirePermission(req, "recruitment", "write");
  const body = await parseBody(req, hireSchema);
  const settings = await getSettings();

  const candidate = await Candidate.findById(body.id);
  if (!candidate) throw NotFound("Pelamar tidak ditemukan.");
  if (candidate.status === "rejected") {
    throw Conflict("Pelamar ini ditandai tidak lolos. Ubah statusnya lebih dulu sebelum merekrut.");
  }

  const emailTaken = await User.findOne({ email: body.officeEmail }).lean();
  if (emailTaken) throw Conflict(`Email kantor ${body.officeEmail} sudah dipakai akun lain.`);

  const existingEmployee = await Employee.findOne({
    $or: [{ officeEmail: body.officeEmail }, { personalEmail: candidate.email }],
  }).lean();
  if (existingEmployee) {
    throw Conflict("Pelamar ini sudah pernah dimigrasikan menjadi karyawan.");
  }

  // Atomic sequence, same as the employees module — deriving the NIP from a
  // document count produced duplicates whenever two hires were saved together.
  const year = new Date(body.joinDate).getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `employee:${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const employeeId = `EMP-${year}-${String(counter.seq).padStart(4, "0")}`;

  // Only what the candidate actually told us is carried over. The previous
  // implementation invented a birth date, gender, religion, NIK, and bank
  // account so the record would validate, which quietly filled the HR database
  // with fabricated personal data.
  const employee = await Employee.create({
    employeeId,
    name: candidate.name,
    personalEmail: candidate.email,
    officeEmail: body.officeEmail,
    phone: candidate.phone,
    branchId: body.branchId,
    divisionId: body.divisionId,
    positionId: body.positionId,
    joinDate: new Date(body.joinDate),
    employmentStatus: body.employmentStatus,
    status: "onboarding",
  });

  let generatedPassword: string | null = null;
  if (body.roleId) {
    const pwd = String(settings.default_employee_password);
    generatedPassword = pwd;
    await User.create({
      email: body.officeEmail,
      passwordHash: await bcrypt.hash(pwd, 12),
      roleId: body.roleId,
      employeeId: employee._id,
      phone: candidate.phone,
      mustChangePassword: Boolean(settings.force_password_change_on_first_login),
    });
  }

  candidate.status = "passed";
  candidate.currentStage = "Onboarding";
  await candidate.save();

  await CandidateStageHistory.create({
    candidateId: candidate._id,
    stage: "Onboarding",
    status: "passed",
    notes: `Diterima sebagai karyawan dengan NIP ${employeeId}. Data pribadi lain dilengkapi HRD.`,
  });

  void resolveRecipientsByRole("HRD").then((recipients) =>
    notifyUsers(recipients, {
      kind: "recruitment",
      title: `${candidate.name} resmi menjadi karyawan`,
      body: `NIP ${employeeId} dibuat. Lengkapi data pribadi, kontrak, dan penempatan asetnya.`,
      href: "/admin/employees",
    })
  );

  void logActivity({
    userId: ctx.user.id,
    action: "HIRE_CANDIDATE",
    module: "recruitment",
    after: { candidate: candidate.name, employeeId },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return apiSuccess(
    { employeeId, employee: employee._id, generatedPassword },
    `${candidate.name} dibuat sebagai karyawan dengan NIP ${employeeId}. ` +
      `Data pribadi seperti NIK, NPWP, dan rekening masih kosong dan perlu dilengkapi di menu Data Karyawan.` +
      (generatedPassword
        ? ` Kata sandi awal akunnya: ${generatedPassword}.`
        : " Akun login belum dibuat karena peran belum dipilih.")
  );
});
