import { Schema, model, models, type Document, type Types } from "mongoose";

export type EventStatus = "draft" | "published" | "ongoing" | "completed";

export interface EventDocument extends Document {
  societyId: Types.ObjectId;
  title: string;
  description: string;
  slug: string;
  date: Date; // start time
  endTime: Date;
  venue: string;
  capacity: number;
  bannerUrl?: string;
  status: EventStatus;

  // Lifecycle automation config
  autoPublishAt: Date | null;
  registrationDeadline: Date | null;
  reminderHoursBefore: number[]; // e.g. [24, 2]
  waitlistEnabled: boolean;
  requiredFields: string[]; // subset of ['universityId', 'phone']

  // Idempotency guard for the "close_registration" automation log entry —
  // registration is already blocked by checking registrationDeadline/
  // capacity live on every register attempt; this just makes sure the
  // *audit log entry* for that transition is only written once.
  registrationClosedLoggedAt: Date | null;

  // Race-safe capacity counters — see lib/automation and the public
  // register route for why these are incremented atomically rather than
  // computed with a live COUNT query on every request.
  registeredCount: number;
  waitlistCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<EventDocument>(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true },
    endTime: { type: Date, required: true },
    venue: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    bannerUrl: { type: String },

    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed"],
      default: "draft",
      index: true,
    },

    autoPublishAt: { type: Date, default: null },
    registrationDeadline: { type: Date, default: null },
    reminderHoursBefore: { type: [Number], default: [24, 2] },
    waitlistEnabled: { type: Boolean, default: true },
    requiredFields: { type: [String], default: [] },
    registrationClosedLoggedAt: { type: Date, default: null },

    registeredCount: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Event = models.Event || model<EventDocument>("Event", EventSchema);
