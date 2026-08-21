import { emailShell, calloutBox } from "./shared";

interface NoShowFollowupParams {
  attendeeName: string;
  eventTitle: string;
  societyName: string;
}

export function noShowFollowupTemplate({
  attendeeName,
  eventTitle,
  societyName,
}: NoShowFollowupParams) {
  const subject = `We missed you at ${eventTitle}`;

  const html = emailShell(`
    <h2 style="margin:0 0 8px;">We missed you</h2>
    <p style="margin:0 0 16px;color:#555;">Hi ${attendeeName},</p>
    ${calloutBox(
      `You were registered for <strong>${eventTitle}</strong> but we didn't see you check in. No worries — we hope to see you at the next ${societyName} event.`,
      "neutral"
    )}
  `);

  return { subject, html };
}
