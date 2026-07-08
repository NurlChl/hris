import mongoose, { Schema, Document } from "mongoose";
import "./Role"; // Force-load Role model registration
import "./Employee"; // Force-load Employee model registration

export interface IUser extends Document {
  email: string;
  passwordHash: string | null;
  roleId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId | null; // Null for superadmin accounts that aren't tied to an employee
  is2faEnabled: boolean;
  twoFactorSecret?: string;
  googleId?: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, default: null },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null, index: true },
    is2faEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    googleId: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
