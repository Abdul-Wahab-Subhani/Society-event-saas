import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";

const bodySchema = z.object({ qrToken: z.string().min(1) });

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
      return NextResponse.json({ error: "Missing QR token" }, { status: 400 });
    }

    const registration = await Registration.findOne({
      eventId: event._id,
      qrToken: parsed.data.qrToken,
    });

    if (!registration) {
      return NextResponse.json({ error: "QR code not recognized for this event" }, { status: 404 });
    }

    if (registration.status === "attended") {
      return NextResponse.json(
        {
          error: "Already checked in",
          attendedAt: registration.attendedAt,
          name: registration.name,
        },
        { status: 409 }
      );
    }

    if (registration.status === "cancelled") {
      return NextResponse.json({ error: "This registration was cancelled" }, { status: 409 });
    }

    registration.status = "attended";
    registration.attendedAt = new Date();
    await registration.save();

    return NextResponse.json({
      ok: true,
      name: registration.name,
      email: registration.email,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
