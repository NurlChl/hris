import mongoose, { Schema, Document } from "mongoose";

export interface IContractTemplate extends Document {
  name: string; // e.g. "Template PKWT Staff"
  content: string; // Markdown content with placeholders like {{name}}, {{position}}, {{salary}}
}

const ContractTemplateSchema = new Schema<IContractTemplate>({
  name: { type: String, required: true, unique: true },
  content: { type: String, required: true },
});

export default mongoose.models.ContractTemplate || mongoose.model<IContractTemplate>("ContractTemplate", ContractTemplateSchema);
