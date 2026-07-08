import { NextResponse } from "next/server";
import { apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import Candidate from "@/models/Candidate";
import CandidateStageHistory from "@/models/CandidateStageHistory";
import Position from "@/models/Position";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, positionId, cvUrl, turnstileToken } = body;

    if (!name || !email || !phone || !positionId) {
      return apiError("BAD_REQUEST", "Data nama, email, phone, dan posisi jabatan wajib diisi", null, 400);
    }

    // Turnstile bot protection token check
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return apiError("FORBIDDEN", "Turnstile verification token is missing.", null, 403);
      }
      
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(process.env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(turnstileToken)}`
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return apiError("BOT_DETECTION", "Verifikasi bot Cloudflare Turnstile gagal.", null, 400);
      }
    }

    await connectToDatabase();

    // Verify position exists
    const pos = await Position.findById(positionId);
    if (!pos) {
      return apiError("NOT_FOUND", "Posisi lowongan kerja tidak ditemukan", null, 404);
    }

    // Check if email already applied
    const emailExists = await Candidate.findOne({ email });
    if (emailExists) {
      return apiError("CONFLICT", "Email ini sudah pernah digunakan untuk melamar", null, 409);
    }

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      positionId,
      source: "career_page",
      currentStage: "Apply",
      status: "pending",
      cvUrl: cvUrl || ""
    });

    await CandidateStageHistory.create({
      candidateId: candidate._id,
      stage: "Apply",
      status: "pending",
      notes: "Pelamar mengirimkan berkas lamaran dari Landing Career Page"
    });

    return apiSuccess(candidate, "Lamaran Anda berhasil terkirim! Terima kasih.");

  } catch (err: any) {
    console.error("Public API Candidate submission error:", err.message);
    return apiError("INTERNAL_SERVER_ERROR", "Terjadi kesalahan internal saat mengirim lamaran.", null, 500);
  }
}
