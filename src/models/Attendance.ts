import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date; // date representing yyyy-mm-dd (set to midnight)
  clockIn?: Date;
  breakOut?: Date;
  breakIn?: Date;
  clockOut?: Date;
  photoUrl: string[]; // clockIn photo, clockOut photo, etc.
  gpsLat: number;
  gpsLng: number;
  isLate: boolean;
  lateMinutes: number;
  isManualFallback: boolean; // true if face-api fails 3x and falls back to normal selfie
  isCrossBranch: boolean; // true if checked in at a branch other than assigned_branch_id
  isLocationOverride: boolean; // true if checked in outside radius using "Kendala Lokasi" emergency request
  note?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    date: { type: Date, required: true, index: true },
    clockIn: { type: Date },
    breakOut: { type: Date },
    breakIn: { type: Date },
    clockOut: { type: Date },
    photoUrl: [{ type: String }],
    gpsLat: { type: Number, required: true },
    gpsLng: { type: Number, required: true },
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    isManualFallback: { type: Boolean, default: false },
    isCrossBranch: { type: Boolean, default: false },
    isLocationOverride: { type: Boolean, default: false },
    note: { type: String },
  },
  {
    timestamps: true,
  }
);

// Unique index for employee per date
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
