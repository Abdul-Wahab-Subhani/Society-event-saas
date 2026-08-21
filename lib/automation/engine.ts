import { connectToDatabase } from "@/lib/db/connect";
import { Event, type EventDocument } from "@/lib/db/models/Event";
import { runAutoPublish } from "./actions/autoPublish";
import { runAutoCloseRegistration } from "./actions/autoCloseRegistration";
import { runAutoTransitionOngoing } from "./actions/autoTransitionOngoing";
import { runAutoComplete } from "./actions/autoComplete";
import { runSendReminders } from "./actions/sendReminders";

export interface AutomationRunSummary {
  eventsProcessed: number;
  erroredEventIds: string[];
}

/**
 * The single entry point both the cron route and the manual "run now" admin
 * trigger call (per the coding standards: automation logic lives in one
 * module, callable from both). Processes every event that isn't already
 * completed — draft events are included since autoPublish is the only
 * action that applies to them.
 *
 * `societyIds`, when passed, scopes the sweep to those societies only —
 * used by the manual admin trigger so one organizer testing automation
 * can't cause another society's events to run early. The cron route omits
 * it and sweeps everything, which is its job.
 *
 * One event's failure never blocks another's — each is wrapped
 * independently so a bug or a downstream API outage on one event doesn't
 * stall the whole sweep.
 */
export async function runAutomationSweep(societyIds?: string[]): Promise<AutomationRunSummary> {
  await connectToDatabase();

  const now = new Date();

  // Completed events stay in the sweep briefly after completion so any
  // certificate/no-show retries from a prior partial failure get picked up
  // — but not forever, or this query grows unbounded as the platform ages.
  // Each action's own guard (certificateSentAt, etc.) makes re-checking a
  // fully-processed event cheap (one empty query), so a generous window is
  // fine here.
  const recentCompletionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const statusFilter = {
    $or: [
      { status: { $in: ["draft", "published", "ongoing"] } },
      { status: "completed", updatedAt: { $gte: recentCompletionCutoff } },
    ],
  };

  const activeEvents: EventDocument[] = await Event.find(
    societyIds ? { $and: [statusFilter, { societyId: { $in: societyIds } }] } : statusFilter
  );

  const erroredEventIds: string[] = [];

  for (const event of activeEvents) {
    try {
      // Re-fetch is unnecessary within a single loop iteration since each
      // action mutates and saves `event` in place before the next runs,
      // keeping the in-memory status current for subsequent checks.
      await runAutoPublish(event, now);
      await runAutoCloseRegistration(event, now);
      await runAutoTransitionOngoing(event, now);
      await runSendReminders(event, now);
      await runAutoComplete(event, now); // no-op unless ongoing -> completed or already completed
    } catch (err) {
      console.error(`Automation sweep failed for event ${event._id}`, err);
      erroredEventIds.push(event._id.toString());
    }
  }

  return { eventsProcessed: activeEvents.length, erroredEventIds };
}
