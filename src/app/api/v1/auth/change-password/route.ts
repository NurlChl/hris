import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import VerificationCode from "@/models/VerificationCode";

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const { code, newPassword } = await req.json();

  if (!code || !newPassword) {
    return apiError("BAD_REQUEST", "Kode OTP dan password baru wajib diisi");
  }

  if (newPassword.length < 6) {
    return apiError("BAD_REQUEST", "Password minimal harus 6 karakter");
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id);
  if (!user || !user.email) {
    return apiError("NOT_FOUND", "Pengguna tidak ditemukan");
  }

  // Validate OTP code
  const record = await VerificationCode.findOne({ email: user.email, code, purpose: "change_password" });
  if (!record || record.expires.getTime() < Date.now()) {
    return apiError("BAD_REQUEST", "Kode OTP salah atau telah kedaluwarsa");
  }

  // Hash and save new password
  const passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordHash = passwordHash;
  await user.save();

  // Delete verification code
  await VerificationCode.deleteOne({ _id: record._id });

  return apiSuccess(null, "Kata sandi Anda berhasil diubah.");
});
