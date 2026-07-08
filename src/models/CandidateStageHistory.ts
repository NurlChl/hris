import mongoose, { Schema, Document } from "mongoose";

export interface ICandidateStageHistory extends Document {
  candidateId: mongoose.Types.ObjectId;
  stage: string;
  status: "pending" | "in_progress" | "passed" | "rejected" | "on_hold";
  notes?: string;
  interviewerId?: mongoose.Types.ObjectId; // References Employee / User
  scheduledAt?: Date;
}

const CandidateStageHistorySchema = new Schema<ICandidateStageHistory>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    stage: { type: String, required: true, index: true },
    status: { 
      type: String, 
      enum: ["pending", "in_progress", "passed", "rejected", "on_hold"], 
      default: "pending",
      required: true 
    },
    notes: { type: String },
    interviewerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    scheduledAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CandidateStageHistory || mongoose.model<ICandidateStageHistory>("CandidateStageHistory", CandidateStageHistorySchema);
