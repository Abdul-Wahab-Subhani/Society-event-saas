import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";
import { generateAndSendCertificates } from "@/lib/automation/actions/generateCertificates";
import { logAutomationAction } from "@/lib/automation/logger";

const bodySchema = z.object({ registrationId: z.string().min(1) });

/**
 * Manual re-send for a single attendee whose certificate bounced — bypasses
 * the certificateSentAt guard (via onlyRegistrationId) since this is an
 * explicit organizer action, not a sweep.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "organizer");

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
    }

    const result = await generateAndSendCertificates(event, {
      onlyRegistrationId: parsed.data.registrationId,
      log: false,
    });

    await logAutomationAction({
      eventId: event._id,
      actionType: "generate_certificate",
      recipientCount: result.sent,
      status: result.sent > 0 ? "success" : "failed",
      errorDetail: result.failed > 0 ? "Manual re-send failed" : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    return authErrorResponse(err);
  }
}
