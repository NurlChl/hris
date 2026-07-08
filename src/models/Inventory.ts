import mongoose, { Schema, Document } from "mongoose";

export interface IInventory extends Document {
  code: string; // Asset code, e.g. AST-LAP-001
  name: string; // e.g. "MacBook Pro M1"
  category: "laptop" | "phone" | "vehicle" | "other";
  condition: "good" | "damaged" | "lost";
}

const InventorySchema = new Schema<IInventory>({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["laptop", "phone", "vehicle", "other"], 
    default: "other", 
    required: true 
  },
  condition: { 
    type: String, 
    enum: ["good", "damaged", "lost"], 
    default: "good", 
    required: true 
  },
});

export default mongoose.models.Inventory || mongoose.model<IInventory>("Inventory", InventorySchema);
