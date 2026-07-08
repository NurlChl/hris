import { auth } from "@/auth";
import { wrapRouteHandler, apiSuccess, apiError } from "@/lib/api";
import { checkPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/audit/logger";
import Employee from "@/models/Employee";
import User from "@/models/User";
import Setting from "@/models/Setting";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";

export const GET = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk mengakses data ini", null, 401);
  }

  await connectToDatabase();

  // Check read permission on attendance/employees
  const perm = await checkPermission(session.user.id, "attendance", "read");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki akses ke data karyawan", null, 403);
  }

  let filter: Record<string, any> = {};

  // Apply RBAC scopes
  if (perm.scope === "self") {
    if (session.user.employeeId) {
      filter._id = session.user.employeeId;
    } else {
      return apiSuccess([], "Berhasil memuat data karyawan"); // Superadmin account without employee link
    }
  } else if (perm.scope === "division") {
    if (session.user.divisionId) {
      filter.divisionId = session.user.divisionId;
    }
  } else if (perm.scope === "branch") {
    if (session.user.branchId) {
      filter.branchId = session.user.branchId;
    }
  }

  const employees = await Employee.find(filter)
    .populate("branchId")
    .populate("divisionId")
    .populate("positionId")
    .populate("supervisorId")
    .populate("storeManagerId")
    .populate("areaManagerId");

  return apiSuccess(employees, "Berhasil memuat data karyawan");
});

export const POST = wrapRouteHandler(async (req) => {
  const session = await auth();
  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Anda harus login untuk melakukan aksi ini", null, 401);
  }

  const perm = await checkPermission(session.user.id, "attendance", "write");
  if (!perm.allowed) {
    return apiError("FORBIDDEN", "Anda tidak memiliki izin untuk mengonfigurasi karyawan", null, 403);
  }

  const body = await req.json();
  const {
    id,
    name,
    nik,
    birthPlace,
    birthDate,
    gender,
    religion,
    maritalStatus,
    ktpAddress,
    domicileAddress,
    personalEmail,
    officeEmail,
    phone,
    socialMedia,
    npwp,
    taxStatus,
    bpjsKesehatan,
    bpjsKetenagakerjaan,
    bankAccount,
    branchId,
    divisionId,
    positionId,
    supervisorId,
    storeManagerId,
    areaManagerId,
    joinDate,
    employmentStatus,
    status,
    roleId,
    password,
  } = body;

  await connectToDatabase();

  let employee;
  let oldData = null;

  if (id) {
    // Update
    oldData = await Employee.findById(id);
    if (!oldData) {
      return apiError("NOT_FOUND", "Data karyawan tidak ditemukan");
    }
    
    employee = await Employee.findByIdAndUpdate(
      id,
      {
        name,
        nik,
        birthPlace,
        birthDate,
        gender,
        religion,
        maritalStatus,
        ktpAddress,
        domicileAddress,
        personalEmail,
        officeEmail,
        phone,
        socialMedia,
        npwp,
        taxStatus,
        bpjsKesehatan,
        bpjsKetenagakerjaan,
        bankAccount,
        branchId,
        divisionId,
        positionId,
        supervisorId: supervisorId || null,
        storeManagerId: storeManagerId || null,
        areaManagerId: areaManagerId || null,
        joinDate,
        employmentStatus,
        status,
      },
      { new: true }
    );

    // Update related User email and password if changed
    if (officeEmail && officeEmail !== oldData.officeEmail) {
      await User.findOneAndUpdate({ employeeId: id }, { email: officeEmail });
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await User.findOneAndUpdate({ employeeId: id }, { passwordHash });
    }

    await logActivity({
      userId: session.user.id,
      action: "UPDATE_EMPLOYEE",
      module: "attendance",
      before: oldData.toObject(),
      after: employee.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });
  } else {
    // Create new
    // Generate unique employee ID: EMP-[YEAR]-[AUTO_INCREMENT]
    const year = new Date(joinDate || Date.now()).getFullYear();
    const count = await Employee.countDocuments({});
    const seq = String(count + 1).padStart(4, "0");
    const employeeId = `EMP-${year}-${seq}`;

    employee = await Employee.create({
      employeeId,
      name,
      nik,
      birthPlace,
      birthDate,
      gender,
      religion,
      maritalStatus,
      ktpAddress,
      domicileAddress,
      personalEmail,
      officeEmail,
      phone,
      socialMedia,
      npwp,
      taxStatus,
      bpjsKesehatan,
      bpjsKetenagakerjaan,
      bankAccount,
      branchId,
      divisionId,
      positionId,
      supervisorId: supervisorId || null,
      storeManagerId: storeManagerId || null,
      areaManagerId: areaManagerId || null,
      joinDate,
      employmentStatus,
      status: status || "onboarding",
    });

    // Automatically create a user login account if roleId is provided
    if (roleId) {
      let pwd = password;
      if (!pwd) {
        const defaultPwdSetting = await Setting.findOne({ key: "default_employee_password" });
        pwd = defaultPwdSetting?.value || "password123";
      }
      const passwordHash = await bcrypt.hash(pwd, 12);
      await User.create({
        email: officeEmail,
        passwordHash,
        roleId,
        employeeId: employee._id,
      });
    }

    await logActivity({
      userId: session.user.id,
      action: "CREATE_EMPLOYEE",
      module: "attendance",
      before: null,
      after: employee.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });
  }

  return apiSuccess(employee, id ? "Berhasil memperbarui data karyawan" : "Berhasil menambahkan data karyawan");
});
