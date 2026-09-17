import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  /** 00:00 WIB of the first and last day, inclusive. */
  startDate: Date;
  endDate: Date;
  /** Days actually deducted (weekends/holidays excluded in working-day mode). */
  chargedDays: number;
  /** Total calendar days spanned — shown next to chargedDays so the difference is visible. */
  calendarDays: number;
  reason: string;
  /** For a catch-all "other" type: what the leave is for, in the employee's words. */
  customPurpose?: string;
  /** Storage key of the supporting document, if any. */
  evidenceUrl?: string;
  approvalInstanceId?: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    chargedDays: { type: Number, required: true, default: 1, min: 0 },
    calendarDays: { type: Number, required: true, default: 1, min: 0 },
    reason: { type: String, required: true },
    customPurpose: { type: String, default: "" },
    evidenceUrl: { type: String, default: "" },
    approvalInstanceId: { type: Schema.Types.ObjectId, ref: "ApprovalInstance" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Overlap detection queries by employee + date range on every submission.
LeaveRequestSchema.index({ employeeId: 1, status: 1, startDate: 1, endDate: 1 });

export default mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
