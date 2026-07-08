import mongoose, { Schema, Document } from "mongoose";

export interface IKpiIndicator {
  name: string;
  weight: number; // percentage (e.g., 25 for 25%)
  target: string;
}

export interface IKpiTemplate extends Document {
  name: string;
  divisionId: mongoose.Types.ObjectId;
  indicators: IKpiIndicator[];
}

const KpiIndicatorSchema = new Schema({
  name: { type: String, required: true },
  weight: { type: Number, required: true },
  target: { type: String, required: true }
});

const KpiTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    indicators: [KpiIndicatorSchema]
  },
  { timestamps: true }
);

export default mongoose.models.KpiTemplate || mongoose.model<IKpiTemplate>("KpiTemplate", KpiTemplateSchema);
