import { emailShell, infoRow, calloutBox } from "./shared";

interface WaitlistPromotionParams {
  attendeeName: string;
  eventTitle: string;
  eventDate: Date;
  venue: string;
  cancelUrl: string;
}

export function waitlistPromotionTemplate({
  attendeeName,
  eventTitle,
  eventDate,
  venue,
  cancelUrl,
}: WaitlistPromotionParams) {
  const formattedDate = eventDate.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const subject = `A spot opened up — you're in for ${eventTitle}!`;

  const html = emailShell(`
    <h2 style="margin:0 0 8px;">You're off the waitlist!</h2>
    <p style="margin:0 0 16px;color:#555;">Hi ${attendeeName},</p>
    ${calloutBox("A spot opened up and you're now confirmed. Your QR code is attached.", "success")}
    <table style="width:100%;">
      ${infoRow("When", formattedDate)}
      ${infoRow("Where", venue)}
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#999;">
      Can't make it? <a href="${cancelUrl}" style="color:#3457d5;">Cancel your registration</a>
    </p>
  `);

  return { subject, html };
}
