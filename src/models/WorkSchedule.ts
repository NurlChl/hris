import mongoose, { Schema, Document } from "mongoose";

export interface IWorkSchedule extends Document {
  name: string; // e.g. "Backoffice Shift A"
  clockIn: string; // e.g. "09:00"
  breakOut?: string; // e.g. "12:00" (optional)
  breakIn?: string; // e.g. "13:00" (optional)
  clockOut: string; // e.g. "17:00"
  isBreakActive: boolean;
  activeDays: number[]; // Array of active days of week (0 = Sunday, 1 = Monday, etc., e.g. [1,2,3,4,5])
  gracePeriodMinutes: number; // grace period for lateness, e.g. 5 minutes
}

const WorkScheduleSchema = new Schema<IWorkSchedule>({
  name: { type: String, required: true, unique: true },
  clockIn: { type: String, required: true },
  breakOut: { type: String },
  breakIn: { type: String },
  clockOut: { type: String, required: true },
  isBreakActive: { type: Boolean, default: false },
  activeDays: [{ type: Number, required: true }],
  gracePeriodMinutes: { type: Number, default: 0, required: true },
});

export default mongoose.models.WorkSchedule || mongoose.model<IWorkSchedule>("WorkSchedule", WorkScheduleSchema);
