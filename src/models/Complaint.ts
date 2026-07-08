import mongoose, { Schema, Document } from "mongoose";

export interface IComplaint extends Document {
  employeeId?: mongoose.Types.ObjectId; // Null if anonymous is selected
  isAnonymous: boolean;
  target: "spv" | "hrd" | "direksi";
  description: string;
  attachments?: string;
  status: "received" | "in_progress" | "resolved" | "rejected";
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    isAnonymous: { type: Boolean, default: false, required: true },
    target: { 
      type: String, 
      enum: ["spv", "hrd", "direksi"], 
      required: true,
      index: true 
    },
    description: { type: String, required: true },
    attachments: { type: String },
    status: { 
      type: String, 
      enum: ["received", "in_progress", "resolved", "rejected"], 
      default: "received",
      required: true,
      index: true
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Complaint || mongoose.model<IComplaint>("Complaint", ComplaintSchema);
