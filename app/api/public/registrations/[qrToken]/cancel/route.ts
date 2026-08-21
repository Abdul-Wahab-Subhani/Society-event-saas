import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { promoteFromWaitlist } from "@/lib/automation/actions/promoteWaitlist";

/**
 * GET renders a confirmation page rather than cancelling immediately —
 * email clients and security scanners often prefetch links, which would
 * silently cancel registrations if GET were mutating. The actual
 * cancellation happens on the POST the confirmation button submits.
 */
export async function GET(_req: NextRequest, { params }: { params: { qrToken: string } }) {
  await connectToDatabase();
  const registration = await Registration.findOne({ qrToken: params.qrToken });

  if (!registration || registration.status === "cancelled") {
    return new NextResponse(renderPage("This registration is no longer active."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const html = `
    <!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:420px;margin:80px auto;text-align:center;">
      <h2>Cancel your registration?</h2>
      <p style="color:#555;">This will free up your spot${registration.status === "registered" ? " for the next person on the waitlist" : ""}.</p>
      <form method="POST">
        <button type="submit" style="background:#c0392b;color:#fff;border:none;border-radius:8px;padding:12px 24px;font-size:14px;cursor:pointer;">
          Confirm cancellation
        </button>
      </form>
    </body></html>
  `;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

export async function POST(_req: NextRequest, { params }: { params: { qrToken: string } }) {
  await connectToDatabase();

  const registration = await Registration.findOne({ qrToken: params.qrToken });
  if (!registration) {
    return new NextResponse(renderPage("Registration not found."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }
  if (registration.status === "cancelled") {
    return new NextResponse(renderPage("Already cancelled."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const wasRegistered = registration.status === "registered";
  const wasWaitlisted = registration.status === "waitlisted";

  registration.status = "cancelled";
  registration.cancelledAt = new Date();
  await registration.save();

  const event = await Event.findById(registration.eventId);
  if (event) {
    await Event.findByIdAndUpdate(event._id, {
      $inc: wasRegistered ? { registeredCount: -1 } : wasWaitlisted ? { waitlistCount: -1 } : {},
    });

    // Freed a confirmed spot — try to fill it from the waitlist immediately.
    if (wasRegistered) {
      const refreshed = await Event.findById(event._id);
      if (refreshed) await promoteFromWaitlist(refreshed);
    }
  }

  return new NextResponse(renderPage("Your registration has been cancelled."), {
    headers: { "Content-Type": "text/html" },
  });
}

function renderPage(message: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:420px;margin:80px auto;text-align:center;">
    <p style="color:#333;">${message}</p>
  </body></html>`;
}
