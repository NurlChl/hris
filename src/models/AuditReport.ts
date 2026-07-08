import mongoose, { Schema, Document } from "mongoose";

export interface IAuditReport extends Document {
  auditorId: mongoose.Types.ObjectId;
  inventoryId: mongoose.Types.ObjectId;
  auditDate: Date;
  condition: "good" | "damaged" | "lost";
  notes: string;
  status: "verified" | "flagged";
}

const AuditReportSchema: Schema = new Schema(
  {
    auditorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inventoryId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
    auditDate: { type: Date, default: Date.now },
    condition: { type: String, enum: ["good", "damaged", "lost"], required: true },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["verified", "flagged"], default: "verified" }
  },
  { timestamps: true }
);

export default mongoose.models.AuditReport || mongoose.model<IAuditReport>("AuditReport", AuditReportSchema);
