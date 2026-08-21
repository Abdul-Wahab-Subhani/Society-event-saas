import type { EventDocument } from "@/lib/db/models/Event";
import { Registration, type RegistrationDocument } from "@/lib/db/models/Registration";
import { Society } from "@/lib/db/models/Society";
import { generateCertificatePdf } from "@/lib/certificates/generateCertificate";
import { certificateDeliveryTemplate } from "@/lib/email/templates/certificateDelivery";
import { sendEmailSafe } from "@/lib/email/send";
import { logAutomationAction } from "../logger";

/**
 * 5.3: generates + emails a certificate to every "attended" registration
 * that doesn't have certificateSentAt set yet. Reusable from both the
 * auto-complete chain and the manual "resend to individual" admin route —
 * pass a single registration to re-send just that one.
 *
 * Returns whether this was called with logging enabled (auto-complete logs
 * once for the whole batch; the manual resend route logs its own way).
 */
export async function generateAndSendCertificates(
  event: EventDocument,
  options: { onlyRegistrationId?: string; log?: boolean } = {}
): Promise<{ sent: number; failed: number }> {
  const query: Record<string, unknown> = {
    eventId: event._id,
    status: "attended",
  };
  if (options.onlyRegistrationId) {
    query._id = options.onlyRegistrationId;
  } else {
    query.certificateSentAt = null;
  }

  const candidates: RegistrationDocument[] = await Registration.find(query);
  if (candidates.length === 0) return { sent: 0, failed: 0 };

  const society = await Society.findById(event.societyId);
  if (!society) return { sent: 0, failed: candidates.length };

  let sent = 0;
  let failed = 0;

  for (const reg of candidates) {
    try {
      const pdfBuffer = await generateCertificatePdf({
        attendeeName: reg.name,
        eventTitle: event.title,
        societyName: society.name,
        eventDate: event.date,
        template: society.certificateTemplate,
      });

      const { subject, html } = certificateDeliveryTemplate({
        attendeeName: reg.name,
        eventTitle: event.title,
        societyName: society.name,
      });

      const ok = await sendEmailSafe({
        to: reg.email,
        subject,
        html,
        attachments: [{ filename: `${event.title}-certificate.pdf`, content: pdfBuffer }],
      });

      if (ok) {
        reg.certificateSentAt = new Date();
        await reg.save();
        sent += 1;
      } else {
        failed += 1;
      }
    } catch (err) {
      console.error(`Certificate generation failed for registration ${reg._id}`, err);
      failed += 1;
    }
  }

  if (options.log !== false) {
    await logAutomationAction({
      eventId: event._id,
      actionType: "generate_certificate",
      recipientCount: sent,
      status: failed === 0 ? "success" : sent > 0 ? "partial" : "failed",
      errorDetail: failed > 0 ? `${failed} certificate(s) failed` : undefined,
    });
  }

  return { sent, failed };
}
