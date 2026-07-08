import mongoose, { Schema, Document } from "mongoose";

export interface IDivision extends Document {
  name: string;
  headId?: mongoose.Types.ObjectId | null;
  branchId?: mongoose.Types.ObjectId | null;
}

const DivisionSchema = new Schema<IDivision>({
  name: { type: String, required: true, index: true },
  headId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null }
});

export default mongoose.models.Division || mongoose.model<IDivision>("Division", DivisionSchema);
