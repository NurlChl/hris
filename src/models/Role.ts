import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string; // e.g. SUPERADMIN, HRD, SPV, STAFF, AUDIT, GA
  isSystemDefault: boolean;
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true, index: true },
  isSystemDefault: { type: Boolean, default: false },
});

export default mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
