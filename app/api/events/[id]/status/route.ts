import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import { Event, type EventStatus } from "@/lib/db/models/Event";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";
import { generateAndSendCertificates } from "@/lib/automation/actions/generateCertificates";
import { runNoShowFollowup } from "@/lib/automation/actions/noShowFollowup";

const bodySchema = z.object({
  status: z.enum(["published", "ongoing", "completed"]),
});

// Only forward transitions the spec allows an organizer to trigger manually
// (draft is set at creation, and jumping backward would strand
// already-sent emails/certificates in an inconsistent state).
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ["published"],
  published: ["ongoing", "completed"],
  ongoing: ["completed"],
  completed: [],
};

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
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const target = parsed.data.status;
    if (!ALLOWED_TRANSITIONS[event.status].includes(target)) {
      return NextResponse.json(
        { error: `Cannot move from "${event.status}" to "${target}"` },
        { status: 400 }
      );
    }

    event.status = target;
    await event.save();

    // Manually completing triggers the same chain the automation engine
    // would have run — an organizer shouldn't get a different outcome for
    // forcing it early vs. letting the cron sweep catch it.
    if (target === "completed") {
      await generateAndSendCertificates(event);
      await runNoShowFollowup(event);
    }

    return NextResponse.json(event);
  } catch (err) {
    return authErrorResponse(err);
  }
}
