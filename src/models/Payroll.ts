import mongoose, { Schema, Document } from "mongoose";

export interface IPayroll extends Document {
  employeeId: mongoose.Types.ObjectId;
  period: string; // e.g. "2026-07"
  basicSalary: number; // Gaji Pokok (periode 1)
  incentives: number; // Insentif (periode 2)
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  overtimeSalary: number;
  /** Attendance facts the slip was derived from — kept so a slip can be
   *  explained months later without recomputing from mutable source data. */
  overtimeHours: number;
  lateMinutes: number;
  absentDays: number;
  presentDays: number;
  workingDays: number;
  generatedAt?: Date;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  fileUrl: string; // PDF link
  generatedBy: mongoose.Types.ObjectId; // References User
  status: "draft" | "published" | "paid";
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    period: { type: String, required: true, index: true },
    basicSalary: { type: Number, required: true },
    incentives: { type: Number, default: 0 },
    allowances: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
      }
    ],
    deductions: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
      }
    ],
    overtimeSalary: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
    totalEarnings: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    fileUrl: { type: String, default: "" },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { 
      type: String, 
      enum: ["draft", "published", "paid"], 
      default: "draft",
      required: true,
      index: true
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one payroll record per employee per period
PayrollSchema.index({ employeeId: 1, period: 1 }, { unique: true });

export default mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);
