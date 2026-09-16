import mongoose, { Schema, Document } from "mongoose";

export interface ICandidateStageHistory extends Document {
  candidateId: mongoose.Types.ObjectId;
  stage: string;
  status: "pending" | "in_progress" | "passed" | "rejected" | "on_hold";
  notes?: string;
  interviewerId?: mongoose.Types.ObjectId; // References Employee / User
  scheduledAt?: Date;
  /**
   * What kind of entry this is. The timeline on a candidate's page mixes stage
   * moves with notes, interviews and ratings; the type decides how each reads.
   */
  type: "applied" | "stage" | "note" | "interview" | "rejected" | "hired" | "rating";
  /** Who did it; null for the candidate's own application. */
  authorUserId?: mongoose.Types.ObjectId | null;
  authorName?: string;
  location?: string;
  interviewerName?: string;
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
    type: {
      type: String,
      enum: ["applied", "stage", "note", "interview", "rejected", "hired", "rating"],
      default: "stage",
    },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, default: "" },
    location: { type: String, default: "" },
    interviewerName: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CandidateStageHistory || mongoose.model<ICandidateStageHistory>("CandidateStageHistory", CandidateStageHistorySchema);
