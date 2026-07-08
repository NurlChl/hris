import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveRequest extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string;
  evidenceUrl?: string; // photo/file proving reason (e.g. sick certificate)
  approvalInstanceId?: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    reason: { type: String, required: true },
    evidenceUrl: { type: String },
    approvalInstanceId: { type: Schema.Types.ObjectId, ref: "ApprovalInstance" },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending",
      required: true,
      index: true
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
