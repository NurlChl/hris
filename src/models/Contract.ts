import mongoose, { Schema, Document } from "mongoose";

export interface IContract extends Document {
  employeeId: mongoose.Types.ObjectId;
  contractNumber: string;
  type: "pkwt" | "pkwtt" | "probation" | "magang" | "harian_lepas" | "paruh_waktu" | "outsource" | "lainnya";
  /** Name of the type when `type` is "lainnya". */
  customTypeLabel: string;
  startDate: Date;
  /** Null for PKWTT. */
  endDate?: Date | null;
  /** Position and pay as agreed in this contract, kept even if the employee changes later. */
  positionName: string;
  salarySnapshot: {
    basicSalary: number;
    allowances: number;
  };
  status: "draft" | "active" | "ended" | "terminated";
  /** What was decided about the next step when a contract nears its end. */
  decision: "pending" | "renew" | "permanent" | "not_renew";
  decisionNote: string;
  decidedAt?: Date | null;
  decidedBy?: mongoose.Types.ObjectId | null;
  previousContractId?: mongoose.Types.ObjectId | null;
  nextContractId?: mongoose.Types.ObjectId | null;
  generatedFromTemplateId?: mongoose.Types.ObjectId | null;
  /** Document text rendered from the template when created; editable before signing. */
  body: string;
  /** Legacy: link to a generated PDF. */
  fileUrl: string;
  /** Storage key or link of the signed scan. */
  signedFile: string;
  signedFileName: string;
  signedAt?: Date | null;
  terminatedAt?: Date | null;
  terminationReason: string;
  notes: string;
  createdBy?: mongoose.Types.ObjectId | null;
}

const ContractSchema = new Schema<IContract>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    contractNumber: { type: String, default: "", index: true },
    type: {
      type: String,
      enum: ["pkwt", "pkwtt", "probation", "magang", "harian_lepas", "paruh_waktu", "outsource", "lainnya"],
      required: true,
    },
    customTypeLabel: { type: String, default: "" },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },
    positionName: { type: String, default: "" },
    salarySnapshot: {
      basicSalary: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["draft", "active", "ended", "terminated", "expired"],
      default: "active",
      required: true,
      index: true,
    },
    decision: { type: String, enum: ["pending", "renew", "permanent", "not_renew"], default: "pending", index: true },
    decisionNote: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    previousContractId: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    nextContractId: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    generatedFromTemplateId: { type: Schema.Types.ObjectId, ref: "ContractTemplate", default: null },
    body: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    signedFile: { type: String, default: "" },
    signedFileName: { type: String, default: "" },
    signedAt: { type: Date, default: null },
    terminatedAt: { type: Date, default: null },
    terminationReason: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// The expiring list: active contracts ordered by end date.
ContractSchema.index({ status: 1, endDate: 1 });

export default mongoose.models.Contract || mongoose.model<IContract>("Contract", ContractSchema);
