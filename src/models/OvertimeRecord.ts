import mongoose, { Schema, Document } from "mongoose";

export interface IOvertimeRecord extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  source: "auto" | "manual";
  notes?: string;
  status: "pending" | "approved" | "rejected";
}

const OvertimeRecordSchema = new Schema<IOvertimeRecord>({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  date: { type: Date, required: true, index: true },
  hours: { type: Number, required: true },
  source: { type: String, enum: ["auto", "manual"], default: "manual", required: true },
  notes: { type: String },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
});

export default mongoose.models.OvertimeRecord || mongoose.model<IOvertimeRecord>("OvertimeRecord", OvertimeRecordSchema);
