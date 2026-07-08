import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveType extends Document {
  name: string; // e.g. "Cuti Tahunan", "Izin Sakit", "Cuti Melahirkan"
  quotaDays: number;
  accrualMode: "prorata" | "flat";
  carryOverMaxDays: number;
  requiresEvidence: boolean;
  minLeadDays: number; // e.g. 3 days notice
}

const LeaveTypeSchema = new Schema<ILeaveType>({
  name: { type: String, required: true, unique: true, index: true },
  quotaDays: { type: Number, default: 12, required: true },
  accrualMode: { type: String, enum: ["prorata", "flat"], default: "flat", required: true },
  carryOverMaxDays: { type: Number, default: 0, required: true },
  requiresEvidence: { type: Boolean, default: false, required: true },
  minLeadDays: { type: Number, default: 0, required: true },
});

export default mongoose.models.LeaveType || mongoose.model<ILeaveType>("LeaveType", LeaveTypeSchema);
