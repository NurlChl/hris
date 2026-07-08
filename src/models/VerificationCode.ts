import mongoose, { Schema, Document } from "mongoose";

export interface IVerificationCode extends Document {
  email: string;
  code: string; // 6-digit code
  purpose: "reset_password" | "change_password";
  expires: Date;
}

const VerificationCodeSchema = new Schema<IVerificationCode>({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ["reset_password", "change_password"], required: true },
  expires: { type: Date, required: true },
});

// Automatically expire the document after expiration date passes
VerificationCodeSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.VerificationCode || mongoose.model<IVerificationCode>("VerificationCode", VerificationCodeSchema);
