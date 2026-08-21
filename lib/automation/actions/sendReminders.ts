import type { EventDocument } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { generateQrPngBuffer } from "@/lib/qr/generateQrImage";
import { reminderTemplate } from "@/lib/email/templates/reminder";
import { sendEmailSafe } from "@/lib/email/send";
import { buildCancelUrl } from "@/lib/email/urls";
import { logAutomationAction } from "../logger";

/**
 * 5.2: for each configured reminderHoursBefore offset, email everyone still
 * "registered" once — guarded per-offset via reminderSentAt[offset] so a
 * multi-offset event (e.g. [24, 2]) sends each reminder exactly once, and
 * a retried cron run never double-sends.
 */
export async function runSendReminders(event: EventDocument, now: Date): Promise<void> {
  if (event.status !== "published" && event.status !== "ongoing") return;

  for (const hoursBefore of event.reminderHoursBefore) {
    const triggerTime = new Date(event.date.getTime() - hoursBefore * 60 * 60 * 1000);
    if (now < triggerTime) continue;

    const key = String(hoursBefore);
    const candidates = await Registration.find({
      eventId: event._id,
      status: "registered",
      [`reminderSentAt.${key}`]: { $exists: false },
    });

    if (candidates.length === 0) continue;

    let sentCount = 0;
    let failedCount = 0;

    for (const reg of candidates) {
      const { subject, html } = reminderTemplate({
        attendeeName: reg.name,
        eventTitle: event.title,
        eventDate: event.date,
        venue: event.venue,
        hoursBefore,
        cancelUrl: buildCancelUrl(reg.qrToken),
      });

      const qrBuffer = await generateQrPngBuffer(reg.qrToken);
      const ok = await sendEmailSafe({
        to: reg.email,
        subject,
        html,
        attachments: [{ filename: "qr-code.png", content: qrBuffer }],
      });

      if (ok) {
        reg.reminderSentAt = { ...reg.reminderSentAt, [key]: now };
        reg.markModified("reminderSentAt");
        await reg.save();
        sentCount += 1;
      } else {
        failedCount += 1;
      }
    }

    await logAutomationAction({
      eventId: event._id,
      actionType: "send_reminder",
      recipientCount: sentCount,
      status: failedCount === 0 ? "success" : sentCount > 0 ? "partial" : "failed",
      errorDetail: failedCount > 0 ? `${failedCount} email(s) failed to send` : undefined,
    });
  }
}
