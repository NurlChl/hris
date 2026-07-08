import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/notification/notificationService";
import User from "@/models/User";
import VerificationCode from "@/models/VerificationCode";

export const POST = wrapRouteHandler(async (req) => {
  const { email } = await req.json();

  if (!email) {
    return apiError("BAD_REQUEST", "Email wajib diisi");
  }

  await connectToDatabase();

  const user = await User.findOne({ email });
  if (!user) {
    // Return success to prevent email enumeration attacks, but bypass sending code
    return apiSuccess(null, "Jika email terdaftar, kode verifikasi telah dikirim.");
  }

  // Generate 6-digit OTP code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

  await VerificationCode.findOneAndUpdate(
    { email, purpose: "reset_password" },
    { code, expires },
    { upsert: true, new: true }
  );

  // Send Email with OTP
  const sent = await sendEmail({
    to: email,
    subject: "Reset Password - HRIS OTP Code",
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 480px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="font-size: 20px; font-weight: bold; color: #111; margin-bottom: 16px;">Kode Verifikasi Reset Password</h2>
        <p>Halo,</p>
        <p>Anda menerima email ini karena ada permintaan untuk mengatur ulang kata sandi akun HRIS Anda.</p>
        <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; margin: 24px 0; color: #000;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #666;">Kode verifikasi ini berlaku selama 15 menit. Jika Anda tidak merasa mengajukan permintaan ini, abaikan email ini.</p>
      </div>
    `
  });

  return apiSuccess(null, "Kode verifikasi telah dikirim ke email Anda.");
});
