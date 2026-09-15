import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceCorrection extends Document {
  employeeId: mongoose.Types.ObjectId;
  /** 00:00 WIB of the day being corrected. */
  date: Date;
  clockInTime: string; // HH:MM WIB
  clockOutTime: string; // HH:MM WIB
  breakOutTime?: string;
  breakInTime?: string;
  reasonType: "lupa_tap" | "kendala_aplikasi" | "dinas_luar" | "lainnya";
  reasonNote: string;
  evidenceUrl?: string;
  /** Submitted after the monthly quota ran out — routed to the escalated flow. */
  isOverQuota: boolean;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvalInstanceId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AttendanceCorrectionSchema = new Schema<IAttendanceCorrection>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    date: { type: Date, required: true, index: true },
    clockInTime: { type: String, required: true },
    clockOutTime: { type: String, required: true },
    breakOutTime: { type: String },
    breakInTime: { type: String },
    reasonType: {
      type: String,
      enum: ["lupa_tap", "kendala_aplikasi", "dinas_luar", "lainnya"],
      required: true,
      index: true,
    },
    reasonNote: { type: String, required: true },
    evidenceUrl: { type: String, default: "" },
    isOverQuota: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    approvalInstanceId: { type: Schema.Types.ObjectId, ref: "ApprovalInstance" },
  },
  { timestamps: true }
);

// Backs both the duplicate check and the monthly quota count.
AttendanceCorrectionSchema.index({ employeeId: 1, date: 1, status: 1 });

export default mongoose.models.AttendanceCorrection ||
  mongoose.model<IAttendanceCorrection>("AttendanceCorrection", AttendanceCorrectionSchema);
