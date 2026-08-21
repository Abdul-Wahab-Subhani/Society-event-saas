import type { EventDocument } from "@/lib/db/models/Event";
import { logAutomationAction } from "../logger";

/** 5.1: if now >= autoPublishAt and status === draft -> published */
export async function runAutoPublish(event: EventDocument, now: Date): Promise<void> {
  if (event.status !== "draft") return;
  if (!event.autoPublishAt || now < event.autoPublishAt) return;

  event.status = "published";
  await event.save();

  await logAutomationAction({
    eventId: event._id,
    actionType: "publish",
    recipientCount: 0,
    status: "success",
  });
}
