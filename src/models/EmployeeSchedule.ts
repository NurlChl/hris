import mongoose, { Schema, Document } from "mongoose";

export interface IEmployeeSchedule extends Document {
  employeeId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId; // References WorkSchedule
  date: Date; // Specific day, or midnight representing the day
}

const EmployeeScheduleSchema = new Schema<IEmployeeSchedule>({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  scheduleId: { type: Schema.Types.ObjectId, ref: "WorkSchedule", required: true, index: true },
  date: { type: Date, required: true, index: true },
});

// A worker can only have one schedule assigned per date
EmployeeScheduleSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.EmployeeSchedule || mongoose.model<IEmployeeSchedule>("EmployeeSchedule", EmployeeScheduleSchema);
