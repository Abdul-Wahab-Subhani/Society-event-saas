import { Schema, model, models, type Document, type Types } from "mongoose";

export type RegistrationStatus =
  | "registered"
  | "waitlisted"
  | "attended"
  | "no-show"
  | "cancelled";

export interface RegistrationDocument extends Document {
  eventId: Types.ObjectId;
  name: string;
  email: string;
  universityId?: string;
  phone?: string;
  qrToken: string;
  status: RegistrationStatus;
  reminderSentAt: Record<string, Date>; // key: hours-before value (e.g. "24"), so each offset is guarded independently
  followUpSentAt: Date | null;
  certificateSentAt: Date | null;
  waitlistPosition: number | null;
  attendedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<RegistrationDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    universityId: { type: String, trim: true },
    phone: { type: String, trim: true },

    // Opaque, cryptographically random. Encodes registrationId only — never
    // PII. Never sequential (see lib/security/qrToken.ts).
    qrToken: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ["registered", "waitlisted", "attended", "no-show", "cancelled"],
      default: "registered",
      index: true,
    },

    // Idempotency guards for the automation engine. reminderSentAt is keyed
    // by offset (e.g. { "24": <date>, "2": <date> }) so an event with
    // multiple reminder offsets doesn't double-send or skip one.
    reminderSentAt: { type: Schema.Types.Mixed, default: {} },
    followUpSentAt: { type: Date, default: null },
    certificateSentAt: { type: Date, default: null },

    waitlistPosition: { type: Number, default: null },
    attendedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One registration per email per event.
RegistrationSchema.index({ eventId: 1, email: 1 }, { unique: true });

export const Registration =
  models.Registration || model<RegistrationDocument>("Registration", RegistrationSchema);
