import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();
  const roles = await Role.find({});
  
  const rolesWithPermissions = [];

  for (const role of roles) {
    const permissions = await RolePermission.find({ roleId: role._id });
    rolesWithPermissions.push({
      _id: role._id,
      name: role.name,
      isSystemDefault: role.isSystemDefault,
      permissions: permissions.map(p => ({
        module: p.module,
        actions: p.actions,
        scope: p.scope
      }))
    });
  }

  return apiSuccess(rolesWithPermissions, "Berhasil memuat data role dan hak akses");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  // Settings permission scope protects roles modifications
  const perm = await checkPermission(session.user.id, "settings", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi role", null, 403);
  }

  const body = await req.json();
  await connectToDatabase();

  // Branch A: Create new role
  if (body.name && !body.roleId) {
    const { name } = body;
    if (!name || typeof name !== "string") {
      return apiError("BAD_REQUEST", "Nama role tidak valid");
    }

    const cleanName = name.trim().toUpperCase().replace(/\s+/g, "_");
    if (!cleanName) {
      return apiError("BAD_REQUEST", "Nama role wajib diisi");
    }

    const exists = await Role.findOne({ name: cleanName });
    if (exists) {
      return apiError("BAD_REQUEST", `Role dengan nama ${cleanName} sudah terdaftar`);
    }

    const newRole = await Role.create({
      name: cleanName,
      isSystemDefault: false
    });

    // Create empty default permissions for this new role
    const modules = ["attendance", "leave", "recruitment", "payroll", "kpi", "contracts", "inventory", "settings", "reports"];
    const createdPerms = [];
    for (const m of modules) {
      const p = await RolePermission.create({
        roleId: newRole._id,
        module: m,
        actions: [],
        scope: "self"
      });
      createdPerms.push(p);
    }

    // Log Activity
    await logActivity({
      userId: session.user.id,
      action: "CREATE_ROLE",
      module: "settings",
      before: null,
      after: { role: newRole, permissions: createdPerms },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return apiSuccess({
      _id: newRole._id,
      name: newRole.name,
      isSystemDefault: false,
      permissions: createdPerms.map(p => ({
        module: p.module,
        actions: p.actions,
        scope: p.scope
      }))
    }, `Berhasil membuat role baru: ${cleanName}`);
  }

  // Branch B: Update existing role permissions
  const { roleId, permissions } = body;

  if (!roleId || !Array.isArray(permissions)) {
    return apiError("BAD_REQUEST", "Data roleId dan permissions (array) wajib diisi atau sertakan 'name' untuk membuat peran baru");
  }

  await connectToDatabase();

  const role = await Role.findById(roleId);
  if (!role) {
    return apiError("NOT_FOUND", "Role tidak ditemukan");
  }

  // Backup old permissions for audit log
  const oldPermissions = await RolePermission.find({ roleId });

  // Update permissions
  // First clear current permissions for this role
  await RolePermission.deleteMany({ roleId });

  // Insert new permissions
  const createdPermissions = [];
  for (const p of permissions) {
    const newPerm = await RolePermission.create({
      roleId,
      module: p.module,
      actions: p.actions,
      scope: p.scope || "self"
    });
    createdPermissions.push(newPerm);
  }

  // Audit logging
  await logActivity({
    userId: session.user.id,
    action: "UPDATE_ROLE_PERMISSIONS",
    module: "settings",
    before: { roleName: role.name, permissions: oldPermissions },
    after: { roleName: role.name, permissions: createdPermissions },
    ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: req.headers.get("user-agent") || "",
  });

  return apiSuccess(createdPermissions, `Berhasil memperbarui hak akses untuk role ${role.name}`);
});
