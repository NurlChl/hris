import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveType extends Document {
  name: string; // e.g. "Cuti Tahunan", "Izin Sakit", "Cuti Melahirkan"
  /** Short explanation shown under the option on the request form. */
  description: string;
  quotaDays: number;
  accrualMode: "prorata" | "flat";
  carryOverMaxDays: number;
  requiresEvidence: boolean;
  minLeadDays: number;
  /** Longest single request allowed; 0 = no limit. */
  maxConsecutiveDays: number;
  /** Deducts from the employee's annual balance. Unpaid/sick leave may not. */
  deductsBalance: boolean;
  /** Lets the holder clock in outside the office radius (WFH / dinas luar). */
  allowsRemoteAttendance: boolean;
  /** Restricts the type to one gender, e.g. maternity leave. */
  genderRestriction: "any" | "male" | "female";
  isActive: boolean;
  /** Tailwind-free token name used to colour the badge in the UI. */
  colorTone: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
}

const LeaveTypeSchema = new Schema<ILeaveType>(
  {
    name: { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, default: "" },
    quotaDays: { type: Number, default: 12, required: true, min: 0 },
    accrualMode: { type: String, enum: ["prorata", "flat"], default: "flat", required: true },
    carryOverMaxDays: { type: Number, default: 0, required: true, min: 0 },
    requiresEvidence: { type: Boolean, default: false, required: true },
    minLeadDays: { type: Number, default: 0, required: true, min: 0 },
    maxConsecutiveDays: { type: Number, default: 0, min: 0 },
    deductsBalance: { type: Boolean, default: true },
    allowsRemoteAttendance: { type: Boolean, default: false },
    genderRestriction: { type: String, enum: ["any", "male", "female"], default: "any" },
    isActive: { type: Boolean, default: true, index: true },
    colorTone: {
      type: String,
      enum: ["primary", "success", "warning", "danger", "info", "neutral"],
      default: "primary",
    },
  },
  { timestamps: true }
);

export default mongoose.models.LeaveType ||
  mongoose.model<ILeaveType>("LeaveType", LeaveTypeSchema);
