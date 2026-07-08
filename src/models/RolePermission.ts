import mongoose, { Schema, Document } from "mongoose";

export interface IRolePermission extends Document {
  roleId: mongoose.Types.ObjectId;
  module: string; // e.g. 'attendance', 'leave', 'payroll', 'recruitment', 'kpi', 'inventory', 'settings'
  actions: string[]; // e.g. ['read', 'write', 'delete', 'approve', 'export']
  scope: string; // 'all' | 'branch' | 'division' | 'self'
}

const RolePermissionSchema = new Schema<IRolePermission>({
  roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true, index: true },
  module: { type: String, required: true, index: true },
  actions: [{ type: String, required: true }],
  scope: { type: String, enum: ["all", "branch", "division", "self"], default: "self" },
});

// Compound unique index for roleId + module
RolePermissionSchema.index({ roleId: 1, module: 1 }, { unique: true });

export default mongoose.models.RolePermission || mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);
