import User from "@/models/User";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";
import { connectToDatabase } from "../db";

export interface PermissionResult {
  allowed: boolean;
  scope: "all" | "branch" | "division" | "self";
}

/**
 * Validates if a user has permission to perform a specific action in a module.
 * 
 * @param userId The ID of the User
 * @param module The module name (e.g. 'attendance', 'leave', 'payroll', 'recruitment', 'settings')
 * @param action The action type (e.g. 'read', 'write', 'delete', 'approve', 'export')
 */
export async function checkPermission(
  userId: string,
  module: string,
  action: string
): Promise<PermissionResult> {
  try {
    await connectToDatabase();

    // 1. Fetch user & populate role
    const user = await User.findById(userId).populate("roleId");
    if (!user || !user.roleId) {
      return { allowed: false, scope: "self" };
    }

    // Role type definition check
    const role = user.roleId as any;
    
    // 2. Superadmin has absolute permissions
    if (role.name === "SUPERADMIN") {
      return { allowed: true, scope: "all" };
    }

    // 3. Query dynamic permissions table
    const permission = await RolePermission.findOne({
      roleId: role._id,
      module: module,
    });

    if (!permission) {
      return { allowed: false, scope: "self" };
    }

    // 4. Check if requested action is authorized
    const isActionAllowed = permission.actions.includes(action);
    
    if (!isActionAllowed) {
      return { allowed: false, scope: "self" };
    }

    return {
      allowed: true,
      scope: permission.scope as any,
    };
  } catch (err) {
    console.error("RBAC permission check error:", err);
    return { allowed: false, scope: "self" };
  }
}
