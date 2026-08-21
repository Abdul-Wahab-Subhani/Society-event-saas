import { emailShell, infoRow, calloutBox } from "./shared";

interface ReminderParams {
  attendeeName: string;
  eventTitle: string;
  eventDate: Date;
  venue: string;
  hoursBefore: number;
  cancelUrl: string;
}

export function reminderTemplate({
  attendeeName,
  eventTitle,
  eventDate,
  venue,
  hoursBefore,
  cancelUrl,
}: ReminderParams) {
  const formattedDate = eventDate.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const when = hoursBefore >= 24 ? `in ${Math.round(hoursBefore / 24)} day(s)` : `in ${hoursBefore} hour(s)`;

  const subject = `Reminder: ${eventTitle} is ${when}`;

  const html = emailShell(`
    <h2 style="margin:0 0 8px;">${eventTitle}</h2>
    <p style="margin:0 0 16px;color:#555;">Hi ${attendeeName}, this is a reminder that your event is coming up.</p>
    ${calloutBox("Your QR code is attached again for convenience — show it at the entrance.", "neutral")}
    <table style="width:100%;">
      ${infoRow("When", formattedDate)}
      ${infoRow("Where", venue)}
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#999;">
      Can't make it anymore? <a href="${cancelUrl}" style="color:#3457d5;">Cancel your registration</a>
    </p>
  `);

  return { subject, html };
}
