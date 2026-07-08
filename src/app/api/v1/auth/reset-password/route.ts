import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import VerificationCode from "@/models/VerificationCode";

export const POST = wrapRouteHandler(async (req) => {
  const { email, code, newPassword } = await req.json();

  if (!email || !code || !newPassword) {
    return apiError("BAD_REQUEST", "Email, kode OTP, dan password baru wajib diisi");
  }

  if (newPassword.length < 6) {
    return apiError("BAD_REQUEST", "Password minimal harus 6 karakter");
  }

  await connectToDatabase();

  // Validate OTP code
  const record = await VerificationCode.findOne({ email, code, purpose: "reset_password" });
  if (!record || record.expires.getTime() < Date.now()) {
    return apiError("BAD_REQUEST", "Kode OTP salah atau telah kedaluwarsa");
  }

  // Update user password
  const user = await User.findOne({ email });
  if (!user) {
    return apiError("NOT_FOUND", "Pengguna tidak ditemukan");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordHash = passwordHash;
  await user.save();

  // Delete verification code
  await VerificationCode.deleteOne({ _id: record._id });

  return apiSuccess(null, "Kata sandi Anda berhasil diperbarui. Silakan login kembali.");
});
