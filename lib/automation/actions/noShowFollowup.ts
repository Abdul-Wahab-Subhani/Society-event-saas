import type { EventDocument } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { Society } from "@/lib/db/models/Society";
import { noShowFollowupTemplate } from "@/lib/email/templates/noShowFollowup";
import { sendEmailSafe } from "@/lib/email/send";
import { logAutomationAction } from "../logger";

/**
 * 5.2: anyone still "registered" (never scanned in) after the event
 * auto-completes gets a "we missed you" email and is marked "no-show".
 * Guarded via followUpSentAt.
 */
export async function runNoShowFollowup(event: EventDocument): Promise<void> {
  // Matches both first-pass candidates (still "registered") and stragglers
  // from a prior partial run whose status was already flipped to "no-show"
  // but whose email failed to send — followUpSentAt is the real guard, not
  // status, so a retry always finds anyone still owed the email.
  const candidates = await Registration.find({
    eventId: event._id,
    status: { $in: ["registered", "no-show"] },
    followUpSentAt: null,
  });

  if (candidates.length === 0) return;

  const society = await Society.findById(event.societyId);
  let sent = 0;
  let failed = 0;

  for (const reg of candidates) {
    const { subject, html } = noShowFollowupTemplate({
      attendeeName: reg.name,
      eventTitle: event.title,
      societyName: society?.name ?? "the society",
    });

    const ok = await sendEmailSafe({ to: reg.email, subject, html });

    reg.status = "no-show";
    if (ok) {
      reg.followUpSentAt = new Date();
      sent += 1;
    } else {
      failed += 1;
    }
    await reg.save();
  }

  await logAutomationAction({
    eventId: event._id,
    actionType: "no_show_followup",
    recipientCount: sent,
    status: failed === 0 ? "success" : sent > 0 ? "partial" : "failed",
    errorDetail: failed > 0 ? `${failed} email(s) failed to send` : undefined,
  });
}
