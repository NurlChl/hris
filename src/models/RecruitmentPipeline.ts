import mongoose, { Schema, Document } from "mongoose";

export interface IRecruitmentPipeline extends Document {
  positionId: mongoose.Types.ObjectId; // References Position
  stages: string[]; // ordered list e.g. ['Apply', 'Screening CV', 'Interview HRD', 'Offering', 'Onboarding']
}

const RecruitmentPipelineSchema = new Schema<IRecruitmentPipeline>({
  positionId: { type: Schema.Types.ObjectId, ref: "Position", required: true, unique: true, index: true },
  stages: [{ type: String, required: true }],
});

export default mongoose.models.RecruitmentPipeline || mongoose.model<IRecruitmentPipeline>("RecruitmentPipeline", RecruitmentPipelineSchema);
