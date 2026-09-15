import mongoose, { Schema, Document } from "mongoose";

export type NotificationKind =
  | "approval_request"
  | "approval_result"
  | "attendance"
  | "payroll"
  | "contract"
  | "recruitment"
  | "inventory"
  | "complaint"
  | "birthday"
  | "system";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where clicking the notification should take the user. */
  href: string;
  isRead: boolean;
  refType?: string;
  refId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, required: true, default: "system" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    href: { type: String, default: "" },
    isRead: { type: Boolean, default: false, index: true },
    refType: { type: String },
    refId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

// The bell only ever queries "my unread, newest first".
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
// Keep the collection from growing without bound — 90 days of history is plenty
// for an in-app feed; the audit log remains the permanent record.
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
