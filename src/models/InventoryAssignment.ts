import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryAssignment extends Document {
  employeeId: mongoose.Types.ObjectId;
  inventoryId: mongoose.Types.ObjectId;
  handoverDate: Date;
  signatureUrl?: string; // canvas draw signature uploaded to storage
  status: "pending_handover" | "active" | "returned";
}

const InventoryAssignmentSchema = new Schema<IInventoryAssignment>({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  inventoryId: { type: Schema.Types.ObjectId, ref: "Inventory", required: true, index: true },
  handoverDate: { type: Date, required: true, default: Date.now },
  signatureUrl: { type: String },
  status: { 
    type: String, 
    enum: ["pending_handover", "active", "returned"], 
    default: "pending_handover",
    required: true,
    index: true
  },
});

export default mongoose.models.InventoryAssignment || mongoose.model<IInventoryAssignment>("InventoryAssignment", InventoryAssignmentSchema);
