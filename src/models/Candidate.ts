import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
  name: string;
  email: string;
  phone: string;
  source: "career_page" | "api" | "manual";
  /** The opening applied to. Null only for legacy rows created before
   *  vacancies were separated from org positions. */
  vacancyId?: mongoose.Types.ObjectId | null;
  positionId?: mongoose.Types.ObjectId | null;
  /** Cover letter or HR's intake note. */
  coverLetter?: string;
  /** Portfolio / LinkedIn supplied on the public form. */
  portfolioUrl?: string;
  /** Set when the candidate is rejected, shown in the timeline. */
  rejectionReason?: string;
  currentStage: string; // e.g. 'Apply', 'Screening CV', 'Offering', 'Onboarding'
  status: "pending" | "in_progress" | "passed" | "rejected" | "on_hold";
  cvUrl?: string;
  notes?: string;
  offeringSalary?: number;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    source: { 
      type: String, 
      enum: ["career_page", "api", "manual"], 
      default: "career_page", 
      required: true 
    },
    vacancyId: { type: Schema.Types.ObjectId, ref: "JobVacancy", default: null, index: true },
    positionId: { type: Schema.Types.ObjectId, ref: "Position", default: null, index: true },
    coverLetter: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
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

// One application per opening, not per person: a globally unique email meant a
// candidate who applied once could never apply to any other vacancy. The
// partial filter keeps legacy rows without a vacancy from colliding with each
// other on a null key.
CandidateSchema.index(
  { email: 1, vacancyId: 1 },
  { unique: true, partialFilterExpression: { vacancyId: { $type: "objectId" } } }
);
// Backs the per-vacancy applicant board.
CandidateSchema.index({ vacancyId: 1, currentStage: 1 });

export default mongoose.models.Candidate || mongoose.model<ICandidate>("Candidate", CandidateSchema);
