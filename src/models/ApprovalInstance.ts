import mongoose, { Schema, Document } from "mongoose";

export interface IApprovalInstance extends Document {
  refType: "leave" | "correction" | "holiday_swap" | "face_change";
  refId: mongoose.Types.ObjectId;
  /** Requester and their division at submission; older instances lack them. */
  employeeId?: mongoose.Types.ObjectId | null;
  divisionId?: mongoose.Types.ObjectId | null;
  currentStep: number; // 1-indexed active step
  status: "pending" | "approved" | "rejected";
  stepsStatus: Array<{
    stepNumber: number;
    approverRole: string;
    status: "pending" | "approved" | "rejected";
    actionedBy?: mongoose.Types.ObjectId;
    actionedAt?: Date;
    comment?: string;
  }>;
  history: Array<{
    action: string; // e.g. 'SUBMITTED', 'APPROVED', 'REJECTED'
    userId: mongoose.Types.ObjectId;
    timestamp: Date;
    comment?: string;
  }>;
}

const ApprovalInstanceSchema = new Schema<IApprovalInstance>(
  {
    refType: { type: String, enum: ["leave", "correction", "holiday_swap", "face_change"], required: true, index: true },
    refId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null, index: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", default: null, index: true },
    currentStep: { type: Number, default: 1, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    stepsStatus: [
      {
        stepNumber: { type: Number, required: true },
        approverRole: { type: String, required: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        actionedBy: { type: Schema.Types.ObjectId, ref: "User" },
        actionedAt: { type: Date },
        comment: { type: String },
      }
    ],
    history: [
      {
        action: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        timestamp: { type: Date, default: Date.now },
        comment: { type: String },
      }
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ApprovalInstance || mongoose.model<IApprovalInstance>("ApprovalInstance", ApprovalInstanceSchema);
