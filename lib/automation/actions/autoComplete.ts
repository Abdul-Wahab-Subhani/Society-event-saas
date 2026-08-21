import type { EventDocument } from "@/lib/db/models/Event";
import { generateAndSendCertificates } from "./generateCertificates";
import { runNoShowFollowup } from "./noShowFollowup";
import { logAutomationAction } from "../logger";

const BUFFER_HOURS = Number(process.env.AUTO_COMPLETE_BUFFER_HOURS ?? "1");

/**
 * 5.1(d): if now >= event.endTime + buffer and status === ongoing ->
 * completed, then chains certificate delivery (5.3) and no-show
 * follow-ups (5.2). The status flip happens first and is saved
 * immediately, so even if a later step in the chain throws, a retry
 * re-enters this function with status already "completed" and the two
 * chained steps re-run safely on their own idempotency guards.
 */
export async function runAutoComplete(event: EventDocument, now: Date): Promise<void> {
  const triggerTime = new Date(event.endTime.getTime() + BUFFER_HOURS * 60 * 60 * 1000);

  if (event.status === "ongoing" && now >= triggerTime) {
    event.status = "completed";
    await event.save();

    await logAutomationAction({
      eventId: event._id,
      actionType: "complete",
      recipientCount: 0,
      status: "success",
    });
  }

  // Re-enter on every run once completed, not just the run that flipped the
  // status — this is what makes certificate/no-show delivery resilient to a
  // failed run: the next cron tick just picks up where it left off via each
  // action's own *SentAt guards.
  if (event.status !== "completed") return;

  try {
    await generateAndSendCertificates(event);
  } catch (err) {
    console.error(`Certificate batch failed for event ${event._id}`, err);
    await logAutomationAction({
      eventId: event._id,
      actionType: "generate_certificate",
      recipientCount: 0,
      status: "failed",
      errorDetail: err instanceof Error ? err.message : "Unknown error",
    });
  }

  try {
    await runNoShowFollowup(event);
  } catch (err) {
    console.error(`No-show follow-up failed for event ${event._id}`, err);
    await logAutomationAction({
      eventId: event._id,
      actionType: "no_show_followup",
      recipientCount: 0,
      status: "failed",
      errorDetail: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
