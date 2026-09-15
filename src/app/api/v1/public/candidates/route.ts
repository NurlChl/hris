import { z } from "zod";
import { wrapRouteHandler, apiSuccess } from "@/lib/api";
import { parseBody, enforceRateLimit, BadRequest, Forbidden, NotFound } from "@/lib/guard";
import { RATE_RULES, clientIp } from "@/lib/rate-limit";
import { connectToDatabase } from "@/lib/db";
import { logActivity } from "@/lib/audit/logger";
import { storageProvider, decodeDataUrl } from "@/lib/storage";
import { safeEqual } from "@/lib/crypto";
import { notifyUsers, resolveRecipientsByRole } from "@/lib/notification/notify";
import Candidate from "@/models/Candidate";
import CandidateStageHistory from "@/models/CandidateStageHistory";
import JobVacancy from "@/models/JobVacancy";

/**
 * Public job-application intake — used by this app's own career page and, with
 * an `x-api-key` header, by external company sites.
 *
 * Everything here is untrusted input: rate limited per IP, validated,
 * bot-checked with Turnstile when configured, and answered with a single
 * neutral message so the endpoint cannot be used to test whether an address has
 * applied before.
 */

const schema = z.object({
  name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter").max(120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{8,20}$/, "Nomor telepon tidak valid"),
  /** Preferred: the vacancy slug from the public listing. */
  vacancySlug: z.string().trim().min(3).max(120).optional(),
  /** Accepted for older integrations that still post a vacancy id. */
  vacancyId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  cv: z.string().optional(),
  coverLetter: z.string().trim().max(3000).optional(),
  portfolioUrl: z.string().trim().max(300).optional(),
  turnstileToken: z.string().optional(),
});

export const POST = wrapRouteHandler(async (req) => {
  const ip = clientIp(req);
  enforceRateLimit("public-candidate", ip, RATE_RULES.publicWrite);

  // External integrations authenticate with a shared key; the career page on
  // this origin does not need one.
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.PUBLIC_API_KEY;
  if (apiKey) {
    if (!expectedKey || !safeEqual(apiKey, expectedKey)) {
      throw Forbidden("API key tidak dikenali.");
    }
  }

  const body = await parseBody(req, schema);
  await verifyTurnstile(body.turnstileToken, ip);

  if (!body.vacancySlug && !body.vacancyId) {
    throw BadRequest("Lowongan yang dilamar wajib disertakan.");
  }

  await connectToDatabase();

  const now = new Date();
  const vacancy = await JobVacancy.findOne({
    ...(body.vacancySlug ? { slug: body.vacancySlug } : { _id: body.vacancyId }),
    status: "open",
    $or: [{ closesAt: null }, { closesAt: { $gte: now } }],
  }).lean<{
    _id: unknown;
    title: string;
    positionId?: unknown;
    stages?: string[];
  } | null>();

  if (!vacancy) {
    throw NotFound("Lowongan yang Anda pilih tidak ditemukan atau sudah ditutup.");
  }

  const neutralMessage =
    "Terima kasih. Lamaran Anda sudah kami terima dan akan ditinjau tim rekrutmen. " +
    "Kami menghubungi pelamar yang profilnya sesuai melalui email atau telepon.";

  // A second application to the same opening is silently ignored rather than
  // answered with a conflict, which would confirm the address is on file.
  const existing = await Candidate.findOne({
    email: body.email,
    vacancyId: vacancy._id,
  }).lean();
  if (existing) return apiSuccess(null, neutralMessage);

  let cvKey = "";
  if (body.cv) {
    const { buffer, ext, mime } = decodeDataUrl(body.cv, [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);
    cvKey = await storageProvider.upload(
      buffer,
      `candidates/${String(vacancy._id)}/${Date.now()}-${body.email.replace(/[^a-z0-9]/gi, "_")}${ext}`,
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
    source: apiKey ? "api" : "career_page",
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
    notes: apiKey ? "Lamaran masuk melalui Public API eksternal" : "Lamaran masuk melalui halaman karier",
  });

  void JobVacancy.updateOne({ _id: vacancy._id }, { $inc: { applicantCount: 1 } }).catch(() => {});

  // HR gets told there is something in the queue; the notification deliberately
  // carries no contact details, only enough to go and look.
  void resolveRecipientsByRole("HRD").then((recipients) =>
    notifyUsers(recipients, {
      kind: "recruitment",
      title: `Pelamar baru: ${vacancy.title}`,
      body: `${body.name} mengirim lamaran untuk posisi ${vacancy.title}.`,
      href: `/admin/vacancies/${String(vacancy._id)}`,
    })
  );

  void logActivity({
    userId: null,
    action: "PUBLIC_CANDIDATE_APPLY",
    module: "recruitment",
    after: { vacancy: vacancy.title, source: apiKey ? "api" : "career_page" },
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });

  // Only a reference is echoed back — never the stored record, which would leak
  // internal ids and pipeline state to an anonymous caller.
  return apiSuccess(
    { reference: String(candidate._id).slice(-8).toUpperCase() },
    neutralMessage,
    undefined,
    201
  );
});

async function verifyTurnstile(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return; // Not configured — the rate limiter is the only defence.

  if (!token) {
    throw Forbidden("Verifikasi anti-bot belum selesai. Muat ulang halaman lalu coba lagi.");
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
  });
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) {
    throw Forbidden("Verifikasi anti-bot gagal. Muat ulang halaman lalu coba lagi.");
  }
}
