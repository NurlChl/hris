import mongoose, { Schema, Document } from "mongoose";

export interface IShift extends Document {
  branchId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  date: Date;
  scheduleId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
}

const ShiftSchema = new Schema<IShift>({
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true, index: true },
  date: { type: Date, required: true, index: true },
  scheduleId: { type: Schema.Types.ObjectId, ref: "WorkSchedule", required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
});

// Avoid duplicate assignments of shifts for employees on the same date
ShiftSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.Shift || mongoose.model<IShift>("Shift", ShiftSchema);
