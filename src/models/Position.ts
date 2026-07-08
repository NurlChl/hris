import mongoose, { Schema, Document } from "mongoose";

export interface IPosition extends Document {
  name: string;
  divisionId?: mongoose.Types.ObjectId | null;
  description?: string;
  jobdesk?: string;
  requirements?: string;
  location?: string;
  type?: string;
  status?: "active" | "inactive";
}

const PositionSchema = new Schema<IPosition>({
  name: { type: String, required: true, unique: true, index: true },
  divisionId: { type: Schema.Types.ObjectId, ref: "Division", default: null },
  description: { type: String, default: "" },
  jobdesk: { type: String, default: "" },
  requirements: { type: String, default: "" },
  location: { type: String, default: "Jakarta" },
  type: { type: String, default: "Full-Time" },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true }
});

export default mongoose.models.Position || mongoose.model<IPosition>("Position", PositionSchema);
