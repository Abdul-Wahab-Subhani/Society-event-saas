import type { EventDocument } from "@/lib/db/models/Event";
import { logAutomationAction } from "../logger";

/**
 * 5.1: registration is already blocked live (see the public register
 * route's own deadline/capacity check) — this action's only job is to
 * write a single audit-log entry the first time we notice registration
 * has closed, guarded by registrationClosedLoggedAt so it never repeats.
 */
export async function runAutoCloseRegistration(event: EventDocument, now: Date): Promise<void> {
  if (event.registrationClosedLoggedAt) return;
  if (event.status !== "published") return;

  const deadlinePassed = !!event.registrationDeadline && now >= event.registrationDeadline;
  const capacityFull = event.registeredCount >= event.capacity && !event.waitlistEnabled;
  if (!deadlinePassed && !capacityFull) return;

  event.registrationClosedLoggedAt = now;
  await event.save();

  await logAutomationAction({
    eventId: event._id,
    actionType: "close_registration",
    recipientCount: 0,
    status: "success",
  });
}
