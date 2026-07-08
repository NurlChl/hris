import mongoose, { Schema, Document } from "mongoose";

export interface IAttendanceCorrection extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  clockInTime: string; // HH:MM
  clockOutTime: string; // HH:MM
  reasonType: "lupa_tap" | "kendala_aplikasi" | "dinas_luar" | "lainnya";
  reasonNote: string;
  evidenceUrl?: string;
  status: "pending" | "approved" | "rejected";
  approvalInstanceId?: mongoose.Types.ObjectId;
}

const AttendanceCorrectionSchema = new Schema<IAttendanceCorrection>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    date: { type: Date, required: true, index: true },
    clockInTime: { type: String, required: true },
    clockOutTime: { type: String, required: true },
    reasonType: { 
      type: String, 
      enum: ["lupa_tap", "kendala_aplikasi", "dinas_luar", "lainnya"], 
      required: true 
    },
    reasonNote: { type: String, required: true },
    evidenceUrl: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    approvalInstanceId: { type: Schema.Types.ObjectId, ref: "ApprovalInstance" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AttendanceCorrection || 
  mongoose.model<IAttendanceCorrection>("AttendanceCorrection", AttendanceCorrectionSchema);
