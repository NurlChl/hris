import mongoose, { Schema, Document } from "mongoose";

export interface IOvertimeRecord extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  source: "auto" | "manual";
  note?: string;
  status: "pending" | "approved" | "rejected";
}

const OvertimeRecordSchema = new Schema<IOvertimeRecord>({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  date: { type: Date, required: true, index: true },
  hours: { type: Number, required: true },
  source: { type: String, enum: ["auto", "manual"], default: "manual", required: true },
  note: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
}, { timestamps: true });

// One overtime record per employee per day, so the daily job can upsert safely
// and a repeated run cannot pay the same hours twice.
OvertimeRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.OvertimeRecord || mongoose.model<IOvertimeRecord>("OvertimeRecord", OvertimeRecordSchema);
