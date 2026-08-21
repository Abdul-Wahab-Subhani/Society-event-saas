import type { EventDocument } from "@/lib/db/models/Event";
import { Event } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { generateQrPngBuffer } from "@/lib/qr/generateQrImage";
import { waitlistPromotionTemplate } from "@/lib/email/templates/waitlistPromotion";
import { sendEmailSafe } from "@/lib/email/send";
import { buildCancelUrl } from "@/lib/email/urls";
import { logAutomationAction } from "../logger";

/**
 * 5.4: promotes the next waitlisted registration into "registered" whenever
 * a spot opens up (called synchronously from the cancellation route — not
 * swept by the cron engine, since promotion should happen the moment a
 * cancellation frees a spot, not up to 15 minutes later). Repeats until the
 * waitlist is empty or capacity is full again.
 *
 * Capacity is still claimed atomically here for the same reason as the
 * public register route: two cancellations landing at once must not both
 * think the same freed spot is theirs to give away.
 */
export async function promoteFromWaitlist(event: EventDocument): Promise<void> {
  let promotedCount = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const claimed = await Event.findOneAndUpdate(
      { _id: event._id, registeredCount: { $lt: event.capacity }, waitlistCount: { $gt: 0 } },
      { $inc: { registeredCount: 1, waitlistCount: -1 } },
      { new: true }
    );
    if (!claimed) break; // no capacity freed, or nobody left on the waitlist

    const next = await Registration.findOneAndUpdate(
      { eventId: event._id, status: "waitlisted" },
      {},
      { sort: { waitlistPosition: 1, createdAt: 1 } }
    );

    if (!next) {
      // Waitlist was empty despite waitlistCount > 0 (drift) — undo the
      // claim and stop rather than lose a real registration slot.
      await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: -1 } });
      break;
    }

    next.status = "registered";
    next.waitlistPosition = null;
    await next.save();

    // Shift everyone still waiting down by one so positions stay accurate.
    await Registration.updateMany(
      { eventId: event._id, status: "waitlisted" },
      { $inc: { waitlistPosition: -1 } }
    );

    const { subject, html } = waitlistPromotionTemplate({
      attendeeName: next.name,
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      cancelUrl: buildCancelUrl(next.qrToken),
    });
    const qrBuffer = await generateQrPngBuffer(next.qrToken);
    await sendEmailSafe({
      to: next.email,
      subject,
      html,
      attachments: [{ filename: "qr-code.png", content: qrBuffer }],
    });

    promotedCount += 1;
  }

  if (promotedCount > 0) {
    await logAutomationAction({
      eventId: event._id,
      actionType: "waitlist_promote",
      recipientCount: promotedCount,
      status: "success",
    });
  }
}
