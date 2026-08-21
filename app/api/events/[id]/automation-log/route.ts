import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { AutomationLog } from "@/lib/db/models/AutomationLog";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "organizer");

    const logs = await AutomationLog.find({ eventId: event._id }).sort({ runAt: -1 }).limit(200);
    return NextResponse.json(logs);
  } catch (err) {
    return authErrorResponse(err);
  }
}
