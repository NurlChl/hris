import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import { connectToDatabase } from "@/lib/db";
import KpiTemplate from "@/models/KpiTemplate";
import KpiEvaluation from "@/models/KpiEvaluation";
import Employee from "@/models/Employee";
import Division from "@/models/Division";
import User from "@/models/User";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  // Allow read access for performance/kpi module
  const perm = await checkPermission(session.user.id, "employees", "read");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk melihat data KPI", null, 403);
  }

  await connectToDatabase();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "dashboard";

  if (type === "templates") {
    const templates = await KpiTemplate.find({})
      .populate("divisionId", "name")
      .lean();
    return apiSuccess(templates, "Berhasil memuat templat KPI");

  } else if (type === "evaluations") {
    const evaluations = await KpiEvaluation.find({})
      .populate("employeeId", "name employeeId NIK branchId divisionId positionId")
      .populate("templateId", "name")
      .populate("evaluatorId", "name")
      .sort({ period: -1, finalScore: -1 })
      .lean();
    return apiSuccess(evaluations, "Berhasil memuat evaluasi KPI");

  } else {
    // Dashboard analytics
    const evaluations = await KpiEvaluation.find({})
      .populate({
        path: "employeeId",
        select: "name divisionId positionId",
        populate: { path: "divisionId", select: "name" }
      })
      .lean();

    const templates = await KpiTemplate.find({}).lean();
    const totalEmployees = await Employee.countDocuments({ status: "active" });

    // Aggregate statistics
    const totalEvaluations = evaluations.length;
    const totalScoreSum = evaluations.reduce((sum, e) => sum + e.finalScore, 0);
    const averageScore = totalEvaluations > 0 ? Number((totalScoreSum / totalEvaluations).toFixed(2)) : 0;

    // Group scores by division
    const divisionStats: Record<string, { sum: number; count: number; name: string }> = {};
    for (const ev of evaluations) {
      const emp = ev.employeeId as any;
      if (emp && emp.divisionId) {
        const divId = emp.divisionId._id.toString();
        const divName = emp.divisionId.name;
        if (!divisionStats[divId]) {
          divisionStats[divId] = { sum: 0, count: 0, name: divName };
        }
        divisionStats[divId].sum += ev.finalScore;
        divisionStats[divId].count += 1;
      }
    }

    const divisionAverages = Object.values(divisionStats).map(div => ({
      name: div.name,
      average: Number((div.sum / div.count).toFixed(2))
    }));

    // Top performers
    const sortedEvaluations = [...evaluations]
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5)
      .map(ev => {
        const emp = ev.employeeId as any;
        return {
          employeeName: emp ? emp.name : "Karyawan Dihapus",
          divisionName: emp && emp.divisionId ? emp.divisionId.name : "-",
          finalScore: ev.finalScore,
          period: ev.period
        };
      });

    return apiSuccess({
      stats: {
        totalEmployees,
        totalEvaluated: totalEvaluations,
        averageScore,
        averagePercentage: Math.min(100, averageScore)
      },
      divisionAverages,
      topPerformers: sortedEvaluations
    }, "Berhasil memuat analisis dashboard KPI");
  }
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "employees", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi KPI", null, 403);
  }

  const body = await req.json();
  const { type, id, name, divisionId, indicators, employeeId, templateId, period, scores, notes } = body;

  await connectToDatabase();

  if (type === "template") {
    if (!name || !divisionId || !indicators || !Array.isArray(indicators)) {
      return apiError("BAD_REQUEST", "Data templat KPI tidak lengkap");
    }

    // Validate weights total = 100%
    const totalWeight = indicators.reduce((sum: number, ind: any) => sum + Number(ind.weight || 0), 0);
    if (totalWeight !== 100) {
      return apiError("BAD_REQUEST", `Total bobot indikator harus 100%. Saat ini: ${totalWeight}%`);
    }

    let template;
    if (id) {
      template = await KpiTemplate.findByIdAndUpdate(
        id,
        { name, divisionId, indicators },
        { new: true }
      );
      await logActivity({
        userId: session.user.id,
        action: "UPDATE_KPI_TEMPLATE",
        module: "employees",
        before: null,
        after: template.toObject(),
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || ""
      });
    } else {
      template = await KpiTemplate.create({ name, divisionId, indicators });
      await logActivity({
        userId: session.user.id,
        action: "CREATE_KPI_TEMPLATE",
        module: "employees",
        before: null,
        after: template.toObject(),
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || ""
      });
    }

    return apiSuccess(template, "Berhasil menyimpan templat KPI");

  } else if (type === "evaluation") {
    if (!employeeId || !templateId || !period || !scores || !Array.isArray(scores)) {
      return apiError("BAD_REQUEST", "Data evaluasi KPI tidak lengkap");
    }

    // Verify template exists
    const template = await KpiTemplate.findById(templateId);
    if (!template) {
      return apiError("NOT_FOUND", "Templat KPI tidak ditemukan");
    }

    // Calculate finalScore as weighted average
    let weightedSum = 0;
    for (const scoreItem of scores) {
      weightedSum += (Number(scoreItem.score || 0) * Number(scoreItem.weight || 0)) / 100;
    }
    const finalScore = Number(weightedSum.toFixed(2));

    // Save evaluation
    const evaluation = await KpiEvaluation.create({
      employeeId,
      templateId,
      period,
      scores,
      finalScore,
      notes: notes || "",
      evaluatorId: session.user.id
    });

    await logActivity({
      userId: session.user.id,
      action: "SUBMIT_KPI_EVALUATION",
      module: "employees",
      before: null,
      after: evaluation.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || ""
    });

    return apiSuccess(evaluation, "Berhasil menyimpan evaluasi penilaian KPI karyawan");
  }

  return apiError("BAD_REQUEST", "Jenis aksi tidak didukung");
});
