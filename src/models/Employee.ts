import mongoose, { Schema, Document } from "mongoose";
import { encrypt, decrypt } from "../lib/crypto";

export interface IEmployee extends Document {
  employeeId: string; // generated automatically, e.g. EMP-2026-0001
  name: string;
  nik: string;
  birthPlace: string;
  birthDate: Date;
  gender: "male" | "female";
  religion: string;
  maritalStatus: string;
  
  // Addresses
  ktpAddress: {
    street: string;
    subdistrict: string;
    city: string;
    province: string;
    country: string;
  };
  domicileAddress: {
    street: string;
    subdistrict: string;
    city: string;
    province: string;
    country: string;
  };

  // Contacts
  personalEmail: string;
  officeEmail: string;
  phone: string;
  socialMedia: {
    linkedIn?: string;
    instagram?: string;
    facebook?: string;
    tikTok?: string;
    website?: string;
    whatsApp?: string;
  };

  // Financials
  npwp: string;
  taxStatus: string; // e.g. TK/0, K/0, K/1
  bpjsKesehatan?: string;
  bpjsKetenagakerjaan?: string;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };

  // Corporate assignment
  branchId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  positionId: mongoose.Types.ObjectId;
  supervisorId?: mongoose.Types.ObjectId | null;
  storeManagerId?: mongoose.Types.ObjectId | null;
  areaManagerId?: mongoose.Types.ObjectId | null;
  joinDate: Date;
  employmentStatus: "probation" | "pkwt" | "pkwtt" | "outsource";
  status: "active" | "onboarding" | "suspended" | "resigned";
  avatarUrl?: string;
  
  // Sensitive documents
  documents: Array<{
    category: string; // e.g. 'KTP', 'KK', 'Ijazah', 'Sertifikat'
    fileUrl: string;
    fileName: string;
  }>;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    nik: { 
      type: String, 
      required: true, 
      set: encrypt, 
      get: decrypt 
    },
    birthPlace: { type: String, required: true },
    birthDate: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    religion: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    
    ktpAddress: {
      street: { type: String, required: true },
      subdistrict: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, required: true },
      country: { type: String, default: "Indonesia", required: true },
    },
    domicileAddress: {
      street: { type: String, required: true },
      subdistrict: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, required: true },
      country: { type: String, default: "Indonesia", required: true },
    },

    personalEmail: { type: String, required: true, unique: true },
    officeEmail: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    socialMedia: {
      linkedIn: { type: String },
      instagram: { type: String },
      facebook: { type: String },
      tikTok: { type: String },
      website: { type: String },
      whatsApp: { type: String },
    },

    npwp: { 
      type: String, 
      required: true, 
      set: encrypt, 
      get: decrypt 
    },
    taxStatus: { type: String, default: "TK/0", required: true },
    bpjsKesehatan: { type: String },
    bpjsKetenagakerjaan: { type: String },
    bankAccount: {
      bankName: { type: String, required: true },
      accountNumber: { 
        type: String, 
        required: true, 
        set: encrypt, 
        get: decrypt 
      },
      accountHolder: { type: String, required: true },
    },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true, index: true },
    positionId: { type: Schema.Types.ObjectId, ref: "Position", required: true, index: true },
    supervisorId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    storeManagerId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    areaManagerId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    joinDate: { type: Date, required: true, index: true },
    employmentStatus: { 
      type: String, 
      enum: ["probation", "pkwt", "pkwtt", "outsource"], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["active", "onboarding", "suspended", "resigned"], 
      default: "onboarding",
      required: true,
      index: true
    },
    avatarUrl: { type: String },
    documents: [
      {
        category: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
      }
    ],
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export default mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);
