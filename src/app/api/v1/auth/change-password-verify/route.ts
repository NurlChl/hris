import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/notification/notificationService";
import User from "@/models/User";
import VerificationCode from "@/models/VerificationCode";

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id);
  if (!user || !user.email) {
    return apiError("NOT_FOUND", "Data pengguna tidak ditemukan");
  }

  // Generate 6-digit OTP code for changing password
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await VerificationCode.findOneAndUpdate(
    { email: user.email, purpose: "change_password" },
    { code, expires },
    { upsert: true, new: true }
  );

  // Send Email with OTP
  await sendEmail({
    to: user.email,
    subject: "Ganti Password - HRIS OTP Code",
    html: `
      <div style="font-family: sans-serif; padding: 24px; color: #333; max-width: 480px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="font-size: 20px; font-weight: bold; color: #111; margin-bottom: 16px;">Kode Verifikasi Ganti Password</h2>
        <p>Halo,</p>
        <p>Anda menerima email ini karena ada permintaan untuk mengganti kata sandi akun HRIS Anda dari portal.</p>
        <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; margin: 24px 0; color: #000;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #666;">Kode verifikasi ini berlaku selama 15 menit. Jika Anda tidak merasa mengajukan permintaan ini, abaikan email ini.</p>
      </div>
    `
  });

  return apiSuccess(null, "Kode verifikasi telah dikirim ke email Anda.");
});
