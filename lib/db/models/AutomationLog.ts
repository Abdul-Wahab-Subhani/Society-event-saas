import { Schema, model, models, type Document, type Types } from "mongoose";

export type AutomationActionType =
  | "publish"
  | "close_registration"
  | "transition_ongoing"
  | "complete"
  | "send_reminder"
  | "no_show_followup"
  | "generate_certificate"
  | "waitlist_promote";

export type AutomationRunStatus = "success" | "partial" | "failed";

export interface AutomationLogDocument extends Document {
  eventId: Types.ObjectId;
  actionType: AutomationActionType;
  recipientCount: number;
  runAt: Date;
  status: AutomationRunStatus;
  errorDetail?: string;
}

const AutomationLogSchema = new Schema<AutomationLogDocument>({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  actionType: {
    type: String,
    enum: [
      "publish",
      "close_registration",
      "transition_ongoing",
      "complete",
      "send_reminder",
      "no_show_followup",
      "generate_certificate",
      "waitlist_promote",
    ],
    required: true,
  },
  recipientCount: { type: Number, default: 0 },
  runAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ["success", "partial", "failed"], required: true },
  errorDetail: { type: String },
});

export const AutomationLog =
  models.AutomationLog || model<AutomationLogDocument>("AutomationLog", AutomationLogSchema);
