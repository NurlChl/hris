import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: any;
  description?: string;
}

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
  description: { type: String },
});

export default mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
