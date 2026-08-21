import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";
import { eventUpdateSchema } from "@/lib/validation/event";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "organizer");

    return NextResponse.json(event);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/**
 * General field edits only — status is deliberately excluded here and
 * handled by POST /api/events/[id]/status, so a client can never smuggle
 * an arbitrary status jump through a generic PATCH body.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "organizer");

    const body = await req.json().catch(() => null);
    const parsed = eventUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    Object.assign(event, parsed.data);
    await event.save();

    return NextResponse.json(event);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** Only draft events can be deleted — anything published has real registrants. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "admin");

    if (event.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft events can be deleted — cancel a published event instead" },
        { status: 400 }
      );
    }

    await event.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
