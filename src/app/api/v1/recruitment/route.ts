import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Candidate from "@/models/Candidate";
import CandidateStageHistory from "@/models/CandidateStageHistory";
import Employee from "@/models/Employee";
import RecruitmentPipeline from "@/models/RecruitmentPipeline";
import Position from "@/models/Position";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "candidate";

  if (type === "pipelines") {
    const pipelines = await RecruitmentPipeline.find({}).populate("positionId");
    return apiSuccess(pipelines, "Berhasil memuat pipeline rekrutmen");
  } else {
    // List candidates
    const candidates = await Candidate.find({})
      .populate("positionId")
      .sort({ updatedAt: -1 });

    const decorated = [];
    for (const c of candidates) {
      const history = await CandidateStageHistory.find({ candidateId: c._id })
        .populate("interviewerId")
        .sort({ createdAt: -1 });
      
      decorated.push({
        ...c.toObject(),
        history
      });
    }

    return apiSuccess(decorated, "Berhasil memuat data pelamar kerja");
  }
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "recruitment", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi rekrutmen", null, 403);
  }

  const body = await req.json();
  const {
    mode, // 'migrate' | 'update_stage' | 'save_pipeline'
    id,
    name,
    email,
    phone,
    positionId,
    stage,
    status,
    notes,
    offeringSalary,
    branchId, // for migration
    divisionId,
    joinDate,
  } = body;

  await connectToDatabase();

  if (mode === "migrate") {
    // Migrate Candidate to Employee
    if (!id || !branchId || !divisionId || !joinDate) {
      return apiError("BAD_REQUEST", "Data id, branchId, divisionId, dan joinDate wajib diisi untuk migrasi");
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return apiError("NOT_FOUND", "Pelamar tidak ditemukan");
    }

    // Check if already migrated
    const employeeExists = await Employee.findOne({ officeEmail: candidate.email });
    if (employeeExists) {
      return apiError("BAD_REQUEST", "Pelamar ini sudah dimigrasikan menjadi karyawan");
    }

    // Generate unique employee ID
    const year = new Date(joinDate).getFullYear();
    const count = await Employee.countDocuments({});
    const seq = String(count + 1).padStart(4, "0");
    const employeeId = `EMP-${year}-${seq}`;

    // Create Employee record
    const employee = await Employee.create({
      employeeId,
      name: candidate.name,
      nik: "0000000000000000", // default placeholder to be updated by HRD
      birthPlace: "Jakarta",
      birthDate: new Date("1995-01-01"),
      gender: "male",
      religion: "Islam",
      maritalStatus: "Belum Kawin",
      ktpAddress: { street: "-", subdistrict: "-", city: "-", province: "-" },
      domicileAddress: { street: "-", subdistrict: "-", city: "-", province: "-" },
      personalEmail: candidate.email,
      officeEmail: candidate.email, // default to candidate email
      phone: candidate.phone,
      npwp: "000000000000000",
      taxStatus: "TK/0",
      bankAccount: { bankName: "MANDIRI", accountNumber: "0000000000", accountHolder: candidate.name },
      branchId,
      divisionId,
      positionId: candidate.positionId,
      joinDate: new Date(joinDate),
      employmentStatus: "probation",
      status: "onboarding",
    });

    candidate.currentStage = "Onboarding";
    candidate.status = "passed";
    await candidate.save();

    await CandidateStageHistory.create({
      candidateId: candidate._id,
      stage: "Onboarding",
      status: "passed",
      notes: `Pelamar berhasil dimigrasikan menjadi karyawan dengan NIP: ${employeeId}`
    });

    await logActivity({
      userId: session.user.id,
      action: "MIGRATE_CANDIDATE_TO_EMPLOYEE",
      module: "recruitment",
      before: candidate.toObject(),
      after: employee.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(employee, `Berhasil memigrasikan pelamar menjadi karyawan baru (NIP: ${employeeId})`);

  } else if (mode === "update_stage") {
    // Update Candidate stage status
    if (!id || !stage || !status) {
      return apiError("BAD_REQUEST", "Data id, stage, dan status wajib diisi");
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return apiError("NOT_FOUND", "Pelamar tidak ditemukan");
    }

    const oldStage = candidate.currentStage;
    candidate.currentStage = stage;
    candidate.status = status;
    if (offeringSalary) candidate.offeringSalary = offeringSalary;
    await candidate.save();

    // Create history entry
    await CandidateStageHistory.create({
      candidateId: id,
      stage,
      status,
      notes,
    });

    await logActivity({
      userId: session.user.id,
      action: "UPDATE_CANDIDATE_STAGE",
      module: "recruitment",
      before: { id, stage: oldStage },
      after: candidate.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(candidate, "Berhasil memperbarui tahapan pelamar");

  } else if (mode === "save_pipeline") {
    const { positionId, stages } = body;
    if (!positionId || !stages || !Array.isArray(stages)) {
      return apiError("BAD_REQUEST", "Data positionId dan stages (array) wajib diisi");
    }
    const pipeline = await RecruitmentPipeline.findOneAndUpdate(
      { positionId },
      { stages },
      { new: true, upsert: true }
    );
    
    await logActivity({
      userId: session.user.id,
      action: "UPDATE_RECRUITMENT_PIPELINE",
      module: "recruitment",
      before: null,
      after: pipeline.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(pipeline, "Berhasil memperbarui pipeline rekrutmen");

  } else {
    // Create new manual candidate (when mode is undefined)
    if (!name || !email || !phone || !positionId) {
      return apiError("BAD_REQUEST", "Data nama, email, phone, dan posisi jabatan wajib diisi");
    }

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      positionId,
      source: "manual",
      currentStage: "Apply",
      status: "pending",
    });

    await CandidateStageHistory.create({
      candidateId: candidate._id,
      stage: "Apply",
      status: "pending",
      notes: "Kandidat ditambahkan secara manual oleh HRD"
    });

    await logActivity({
      userId: session.user.id,
      action: "CREATE_CANDIDATE",
      module: "recruitment",
      before: null,
      after: candidate.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess(candidate, "Berhasil menambahkan pelamar");
  }
});
