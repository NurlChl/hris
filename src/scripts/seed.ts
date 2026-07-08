import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../lib/db";
import Role from "../models/Role";
import RolePermission from "../models/RolePermission";
import Setting from "../models/Setting";
import User from "../models/User";
import ApprovalFlow from "../models/ApprovalFlow";
import LeaveType from "../models/LeaveType";
import Branch from "../models/Branch";
import Division from "../models/Division";
import Position from "../models/Position";
import Employee from "../models/Employee";

// Define env variables locally if not loaded (for script environment)
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hris";

async function seed() {
  console.log("Starting database seeding...");
  
  try {
    await connectToDatabase();
    
    // 1. Seed Roles
    const rolesToSeed = [
      { name: "SUPERADMIN", isSystemDefault: true },
      { name: "DIREKSI", isSystemDefault: true },
      { name: "HRD", isSystemDefault: true },
      { name: "AUDIT", isSystemDefault: true },
      { name: "GA", isSystemDefault: true },
      { name: "SPV", isSystemDefault: true },
      { name: "STAFF", isSystemDefault: true },
    ];
    
    console.log("Seeding Roles...");
    const roleDocs: Record<string, any> = {};
    for (const r of rolesToSeed) {
      let roleDoc = await Role.findOne({ name: r.name });
      if (!roleDoc) {
        roleDoc = await Role.create(r);
        console.log(`Created Role: ${r.name}`);
      } else {
        console.log(`Role ${r.name} already exists`);
      }
      roleDocs[r.name] = roleDoc;
    }

    // 2. Seed Role Permissions
    console.log("Seeding Role Permissions...");
    // Clear old permissions to re-seed cleanly
    await RolePermission.deleteMany({});
    
    const permissionsToSeed = [
      // --- STAFF PERMISSIONS ---
      { role: "STAFF", module: "attendance", actions: ["read", "write"], scope: "self" },
      { role: "STAFF", module: "leave", actions: ["read", "write"], scope: "self" },
      { role: "STAFF", module: "payroll", actions: ["read"], scope: "self" },
      { role: "STAFF", module: "kpi", actions: ["read"], scope: "self" },
      { role: "STAFF", module: "contracts", actions: ["read"], scope: "self" },
      { role: "STAFF", module: "inventory", actions: ["read"], scope: "self" },
      
      // --- SPV PERMISSIONS ---
      { role: "SPV", module: "attendance", actions: ["read", "write"], scope: "division" },
      { role: "SPV", module: "leave", actions: ["read", "approve"], scope: "division" },
      { role: "SPV", module: "recruitment", actions: ["read"], scope: "division" },
      { role: "SPV", module: "kpi", actions: ["read", "write"], scope: "division" },
      { role: "SPV", module: "inventory", actions: ["read"], scope: "division" },
      { role: "SPV", module: "reports", actions: ["read"], scope: "division" },

      // --- HRD PERMISSIONS ---
      { role: "HRD", module: "attendance", actions: ["read", "write"], scope: "all" },
      { role: "HRD", module: "leave", actions: ["read", "write", "approve"], scope: "all" },
      { role: "HRD", module: "recruitment", actions: ["read", "write"], scope: "all" },
      { role: "HRD", module: "payroll", actions: ["read", "write"], scope: "all" },
      { role: "HRD", module: "kpi", actions: ["read", "write"], scope: "all" },
      { role: "HRD", module: "contracts", actions: ["read", "write"], scope: "all" },
      { role: "HRD", module: "inventory", actions: ["read"], scope: "all" },
      { role: "HRD", module: "settings", actions: ["read"], scope: "all" },
      { role: "HRD", module: "reports", actions: ["read"], scope: "all" },

      // --- AUDIT PERMISSIONS ---
      { role: "AUDIT", module: "attendance", actions: ["read"], scope: "all" },
      { role: "AUDIT", module: "leave", actions: ["read", "approve"], scope: "all" },
      { role: "AUDIT", module: "recruitment", actions: ["read"], scope: "all" },
      { role: "AUDIT", module: "payroll", actions: ["read"], scope: "all" },
      { role: "AUDIT", module: "kpi", actions: ["read"], scope: "all" },
      { role: "AUDIT", module: "contracts", actions: ["read"], scope: "all" },
      { role: "AUDIT", module: "inventory", actions: ["read"], scope: "all" },
      { role: "AUDIT", module: "reports", actions: ["read"], scope: "all" },

      // --- GA PERMISSIONS ---
      { role: "GA", module: "inventory", actions: ["read", "write"], scope: "all" },

      // --- DIREKSI PERMISSIONS ---
      { role: "DIREKSI", module: "attendance", actions: ["read"], scope: "all" },
      { role: "DIREKSI", module: "leave", actions: ["read", "approve"], scope: "all" },
      { role: "DIREKSI", module: "recruitment", actions: ["read"], scope: "all" },
      { role: "DIREKSI", module: "payroll", actions: ["read"], scope: "all" },
      { role: "DIREKSI", module: "kpi", actions: ["read"], scope: "all" },
      { role: "DIREKSI", module: "contracts", actions: ["read", "approve"], scope: "all" },
      { role: "DIREKSI", module: "inventory", actions: ["read"], scope: "all" },
      { role: "DIREKSI", module: "reports", actions: ["read"], scope: "all" },
    ];

    for (const p of permissionsToSeed) {
      const roleId = roleDocs[p.role]?._id;
      if (roleId) {
        await RolePermission.create({
          roleId,
          module: p.module,
          actions: p.actions,
          scope: p.scope,
        });
        console.log(`Created Permission: [${p.role}] module: ${p.module}`);
      }
    }

    // 3. Seed Global Settings
    console.log("Seeding settings...");
    const settingsToSeed = [
      { key: "grace_period_minutes", value: 1, description: "Grace period for tardiness in minutes" },
      { key: "max_absen_correction", value: 3, description: "Maximum leave/attendance corrections permitted per month" },
      { key: "holiday_swap_lead_days", value: 7, description: "Minimum days in advance required for public holiday swap requests" },
      { key: "default_geo_radius", value: 15, description: "Default geo-fence radius in meters around office branch location" },
      { key: "default_employee_password", value: "password123", description: "Default login password for newly created employee accounts" },
      { key: "require_selfie_clock_in", value: true, description: "Require selfie verification for clock in" },
      { key: "require_selfie_break_out", value: false, description: "Require selfie verification for starting break" },
      { key: "require_selfie_break_in", value: false, description: "Require selfie verification for ending break" },
      { key: "require_selfie_clock_out", value: true, description: "Require selfie verification for clock out" },
      { key: "enable_break_attendance", value: true, description: "Enable break time attendance for employees" },
    ];

    for (const s of settingsToSeed) {
      const exists = await Setting.findOne({ key: s.key });
      if (!exists) {
        await Setting.create(s);
        console.log(`Created setting: ${s.key} = ${s.value}`);
      } else {
        console.log(`Setting ${s.key} already exists`);
      }
    }

    // 3.1. Seed Leave Types
    console.log("Seeding leave types...");
    const leaveTypesToSeed = [
      { name: "Cuti Tahunan", quotaDays: 12, accrualMode: "flat", carryOverMaxDays: 6, requiresEvidence: false, minLeadDays: 3 },
      { name: "Izin Sakit", quotaDays: 30, accrualMode: "flat", carryOverMaxDays: 0, requiresEvidence: true, minLeadDays: 0 },
      { name: "Cuti Menikah", quotaDays: 3, accrualMode: "flat", carryOverMaxDays: 0, requiresEvidence: false, minLeadDays: 7 },
    ];

    for (const lt of leaveTypesToSeed) {
      const exists = await LeaveType.findOne({ name: lt.name });
      if (!exists) {
        await LeaveType.create(lt);
        console.log(`Created leave type: ${lt.name}`);
      } else {
        console.log(`Leave type ${lt.name} already exists`);
      }
    }

    // 3.2. Seed Approval Flows
    console.log("Seeding approval flows...");
    const flowsToSeed = [
      {
        transactionType: "leave",
        steps: [
          { stepNumber: 1, approverRole: "SPV", isMandatory: true },
          { stepNumber: 2, approverRole: "HRD", isMandatory: true }
        ]
      },
      {
        transactionType: "correction",
        steps: [
          { stepNumber: 1, approverRole: "SPV", isMandatory: true },
          { stepNumber: 2, approverRole: "HRD", isMandatory: true }
        ]
      },
      {
        transactionType: "holiday_swap",
        steps: [
          { stepNumber: 1, approverRole: "SPV", isMandatory: true },
          { stepNumber: 2, approverRole: "HRD", isMandatory: true }
        ]
      }
    ];

    for (const f of flowsToSeed) {
      const exists = await ApprovalFlow.findOne({ transactionType: f.transactionType });
      if (!exists) {
        await ApprovalFlow.create(f);
        console.log(`Created approval flow for: ${f.transactionType}`);
      } else {
        console.log(`Approval flow for ${f.transactionType} already exists`);
      }
    }

    // 3.3. Seed Master Penempatan (Cabang, Divisi, Jabatan)
    console.log("Seeding master corporate data...");
    
    let branchDoc = await Branch.findOne({ code: "KPJ" });
    if (!branchDoc) {
      branchDoc = await Branch.create({
        name: "Kantor Pusat Jakarta",
        code: "KPJ",
        lat: -6.200000,
        lng: 106.816666,
        radius: 150,
        address: "Jl. Jenderal Sudirman No. 1, Jakarta Pusat",
      });
      console.log("Created corporate Branch: Kantor Pusat Jakarta");
    }

    let divisionDoc = await Division.findOne({ code: "IT" });
    if (!divisionDoc) {
      divisionDoc = await Division.create({
        name: "Teknologi Informasi",
        code: "IT",
      });
      console.log("Created corporate Division: Teknologi Informasi");
    }

    let positionDoc = await Position.findOne({ code: "SSE" });
    if (!positionDoc) {
      positionDoc = await Position.create({
        name: "Senior Software Engineer",
        code: "SSE",
        divisionId: divisionDoc._id,
      });
      console.log("Created corporate Position: Senior Software Engineer");
    }

    // 3.4. Seed Default Employee & STAFF User
    console.log("Seeding default Employee & Staff account...");
    const empEmail = "budi@hris.com";
    let employeeDoc = await Employee.findOne({ personalEmail: empEmail });
    
    if (!employeeDoc) {
      employeeDoc = await Employee.create({
        employeeId: "EMP-2026-0001",
        name: "Budi Santoso",
        nik: "1234567890123456",
        birthPlace: "Jakarta",
        birthDate: new Date("1995-05-15"),
        gender: "male",
        religion: "Islam",
        maritalStatus: "Single",
        ktpAddress: {
          street: "Jl. Mawar No. 12",
          subdistrict: "Tebet",
          city: "Jakarta Selatan",
          province: "DKI Jakarta",
          country: "Indonesia",
        },
        domicileAddress: {
          street: "Jl. Mawar No. 12",
          subdistrict: "Tebet",
          city: "Jakarta Selatan",
          province: "DKI Jakarta",
          country: "Indonesia",
        },
        personalEmail: empEmail,
        officeEmail: "budi.santoso@hris.com",
        phone: "08123456789",
        socialMedia: {},
        npwp: "123456789000",
        taxStatus: "TK/0",
        bankAccount: {
          bankName: "Bank Central Asia (BCA)",
          accountNumber: "8881234567",
          accountHolder: "Budi Santoso",
        },
        branchId: branchDoc._id,
        divisionId: divisionDoc._id,
        positionId: positionDoc._id,
        joinDate: new Date("2026-01-01"),
        employmentStatus: "pkwtt",
        status: "active",
      });
      console.log("Created default Employee profile: Budi Santoso (EMP-2026-0001)");
    }

    // Seed User for Staff
    const staffUserExists = await User.findOne({ email: empEmail });
    if (!staffUserExists) {
      const staffPasswordHash = await bcrypt.hash("budi123", 12);
      await User.create({
        email: empEmail,
        passwordHash: staffPasswordHash,
        roleId: roleDocs["STAFF"]._id,
        employeeId: employeeDoc._id,
        is2faEnabled: false,
      });
      console.log(`Created Staff User account: ${empEmail} (password: budi123)`);
    }

    // 4. Seed Superadmin User Account
    console.log("Seeding Superadmin account...");
    const adminEmail = "admin@hris.com";
    const passwordHash = await bcrypt.hash("admin123", 12);
    
    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        email: adminEmail,
        passwordHash,
        roleId: roleDocs["SUPERADMIN"]._id,
        is2faEnabled: false,
      },
      { upsert: true, new: true }
    );
    console.log(`Upserted Superadmin User account: ${adminEmail} (password: admin123)`);

    console.log("Database seeding completed successfully!");
    mongoose.connection.close();
    process.exit(0);
  } catch (err: any) {
    console.error("Error seeding database:", err.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

seed();
