import mongoose, { Schema, Document } from "mongoose";

export interface IEmployeeSchedule extends Document {
  employeeId: mongoose.Types.ObjectId;
  /** Null when the override makes the day a day off. */
  scheduleId?: mongoose.Types.ObjectId | null; // References WorkSchedule
  date: Date; // Specific day, or midnight representing the day
  isOffDay: boolean;
  note: string;
  createdBy?: mongoose.Types.ObjectId | null;
}

const EmployeeScheduleSchema = new Schema<IEmployeeSchedule>({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  scheduleId: { type: Schema.Types.ObjectId, ref: "WorkSchedule", default: null, index: true },
  date: { type: Date, required: true, index: true },
  isOffDay: { type: Boolean, default: false },
  note: { type: String, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

// A worker can only have one schedule assigned per date
EmployeeScheduleSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.EmployeeSchedule || mongoose.model<IEmployeeSchedule>("EmployeeSchedule", EmployeeScheduleSchema);
