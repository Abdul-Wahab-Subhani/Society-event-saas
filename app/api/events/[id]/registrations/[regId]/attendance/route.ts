import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; regId: string } }
) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "organizer");

    const registration = await Registration.findOne({ _id: params.regId, eventId: event._id });
    if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

    if (registration.status === "attended") {
      return NextResponse.json({ error: "Already marked attended" }, { status: 409 });
    }

    registration.status = "attended";
    registration.attendedAt = new Date();
    await registration.save();

    return NextResponse.json(registration);
  } catch (err) {
    return authErrorResponse(err);
  }
}
