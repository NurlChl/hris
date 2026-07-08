import mongoose, { Schema, Document } from "mongoose";

export interface IContract extends Document {
  employeeId: mongoose.Types.ObjectId;
  type: "probation" | "pkwt" | "pkwtt" | "outsource";
  startDate: Date;
  endDate?: Date; // Null for permanent PKWTT
  fileUrl: string; // PDF link
  generatedFromTemplateId?: mongoose.Types.ObjectId;
  salarySnapshot: {
    basicSalary: number;
    allowances: number;
  };
  status: "active" | "expired" | "terminated";
}

const ContractSchema = new Schema<IContract>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    type: { 
      type: String, 
      enum: ["probation", "pkwt", "pkwtt", "outsource"], 
      required: true 
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date },
    fileUrl: { type: String, required: true },
    generatedFromTemplateId: { type: Schema.Types.ObjectId, ref: "ContractTemplate" },
    salarySnapshot: {
      basicSalary: { type: Number, required: true },
      allowances: { type: Number, default: 0 },
    },
    status: { 
      type: String, 
      enum: ["active", "expired", "terminated"], 
      default: "active",
      required: true,
      index: true
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Contract || mongoose.model<IContract>("Contract", ContractSchema);
