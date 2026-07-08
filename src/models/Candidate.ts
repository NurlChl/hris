import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
  name: string;
  email: string;
  phone: string;
  source: "career_page" | "api" | "manual";
  positionId: mongoose.Types.ObjectId; // References Position
  currentStage: string; // e.g. 'Apply', 'Screening CV', 'Offering', 'Onboarding'
  status: "pending" | "in_progress" | "passed" | "rejected" | "on_hold";
  cvUrl?: string;
  notes?: string;
  offeringSalary?: number;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true },
    source: { 
      type: String, 
      enum: ["career_page", "api", "manual"], 
      default: "career_page", 
      required: true 
    },
    positionId: { type: Schema.Types.ObjectId, ref: "Position", required: true, index: true },
    currentStage: { type: String, default: "Apply", required: true },
    status: { 
      type: String, 
      enum: ["pending", "in_progress", "passed", "rejected", "on_hold"], 
      default: "pending",
      required: true,
      index: true
    },
    cvUrl: { type: String },
    notes: { type: String },
    offeringSalary: { type: Number },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Candidate || mongoose.model<ICandidate>("Candidate", CandidateSchema);
