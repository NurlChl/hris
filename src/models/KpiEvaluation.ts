import mongoose, { Schema, Document } from "mongoose";

export interface IKpiEvaluationScore {
  indicatorName: string;
  weight: number;
  score: number; // 0 to 100
}

export interface IKpiEvaluation extends Document {
  employeeId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  period: string; // e.g., "2026-07"
  scores: IKpiEvaluationScore[];
  finalScore: number; // weighted average
  notes: string;
  evaluatorId: mongoose.Types.ObjectId;
}

const KpiEvaluationScoreSchema = new Schema({
  indicatorName: { type: String, required: true },
  weight: { type: Number, required: true },
  score: { type: Number, required: true }
});

const KpiEvaluationSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "KpiTemplate", required: true },
    period: { type: String, required: true }, // Format "YYYY-MM"
    scores: [KpiEvaluationScoreSchema],
    finalScore: { type: Number, required: true },
    notes: { type: String, default: "" },
    evaluatorId: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default mongoose.models.KpiEvaluation || mongoose.model<IKpiEvaluation>("KpiEvaluation", KpiEvaluationSchema);
