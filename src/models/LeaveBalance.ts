import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveBalance extends Document {
  employeeId: mongoose.Types.ObjectId;
  leaveTypeId: mongoose.Types.ObjectId;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  leaveTypeId: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
  year: { type: Number, required: true, index: true },
  allocatedDays: { type: Number, required: true },
  usedDays: { type: Number, default: 0, required: true },
  pendingDays: { type: Number, default: 0, required: true },
  remainingDays: { type: Number, required: true },
});

// Compound index to guarantee one balance record per type per year
LeaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

export default mongoose.models.LeaveBalance || mongoose.model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema);
