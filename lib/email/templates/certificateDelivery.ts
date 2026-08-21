import { emailShell, calloutBox } from "./shared";

interface CertificateDeliveryParams {
  attendeeName: string;
  eventTitle: string;
  societyName: string;
}

export function certificateDeliveryTemplate({
  attendeeName,
  eventTitle,
  societyName,
}: CertificateDeliveryParams) {
  const subject = `Your certificate for ${eventTitle}`;

  const html = emailShell(`
    <h2 style="margin:0 0 8px;">Your certificate is ready</h2>
    <p style="margin:0 0 16px;color:#555;">Hi ${attendeeName},</p>
    ${calloutBox(
      `Thanks for attending <strong>${eventTitle}</strong>. Your certificate of participation from ${societyName} is attached.`,
      "success"
    )}
  `);

  return { subject, html };
}
