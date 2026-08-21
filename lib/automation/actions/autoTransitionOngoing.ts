import type { EventDocument } from "@/lib/db/models/Event";
import { logAutomationAction } from "../logger";

/** 5.1: if now >= event.date and status === published -> ongoing */
export async function runAutoTransitionOngoing(event: EventDocument, now: Date): Promise<void> {
  if (event.status !== "published") return;
  if (now < event.date) return;

  event.status = "ongoing";
  await event.save();

  await logAutomationAction({
    eventId: event._id,
    actionType: "transition_ongoing",
    recipientCount: 0,
    status: "success",
  });
}
