import { emailShell, infoRow, calloutBox } from "./shared";

interface RegistrationConfirmationParams {
  attendeeName: string;
  eventTitle: string;
  eventDate: Date;
  venue: string;
  isWaitlisted: boolean;
  waitlistPosition?: number | null;
  cancelUrl: string;
}

export function registrationConfirmationTemplate({
  attendeeName,
  eventTitle,
  eventDate,
  venue,
  isWaitlisted,
  waitlistPosition,
  cancelUrl,
}: RegistrationConfirmationParams) {
  const formattedDate = eventDate.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

  const subject = isWaitlisted
    ? `You're on the waitlist for ${eventTitle}`
    : `You're registered for ${eventTitle}`;

  const status = isWaitlisted
    ? calloutBox(
        `You're currently <strong>#${waitlistPosition ?? "-"} on the waitlist</strong>. We'll email you automatically if a spot opens up.`,
        "warning"
      )
    : calloutBox(
        "You're confirmed. Your QR code is attached — show it at the entrance for check-in.",
        "success"
      );

  const html = emailShell(`
    <h2 style="margin:0 0 8px;">${eventTitle}</h2>
    <p style="margin:0 0 16px;color:#555;">Hi ${attendeeName},</p>
    ${status}
    <table style="width:100%;">
      ${infoRow("When", formattedDate)}
      ${infoRow("Where", venue)}
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#999;">
      Can't make it? <a href="${cancelUrl}" style="color:#3457d5;">Cancel your registration</a>${
        isWaitlisted ? "" : " and free up your spot for the next person on the waitlist."
      }
    </p>
  `);

  return { subject, html };
}
