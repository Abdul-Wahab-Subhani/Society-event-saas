import { resend, EMAIL_FROM } from "./resend";

interface SendParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Never throws — a failed send should never abort an automation run or
 * roll back a DB write. Callers check the boolean and decide how to count
 * it (e.g. toward a "partial" AutomationLog status).
 */
export async function sendEmailSafe(params: SendParams): Promise<boolean> {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${params.to}`, err);
    return false;
  }
}
