import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";

/**
 * Public — no auth. Returns only what a prospective registrant needs.
 * Draft events 404 as if they don't exist publicly.
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  await connectToDatabase();

  const event = await Event.findOne({ slug: params.slug }).populate("societyId", "name logo");
  if (!event || event.status === "draft") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const spotsLeft = Math.max(event.capacity - event.registeredCount, 0);
  const registrationOpen =
    event.status === "published" &&
    (!event.registrationDeadline || new Date() < event.registrationDeadline);

  return NextResponse.json({
    title: event.title,
    description: event.description,
    date: event.date,
    endTime: event.endTime,
    venue: event.venue,
    bannerUrl: event.bannerUrl,
    society: event.societyId,
    spotsLeft,
    capacity: event.capacity,
    waitlistEnabled: event.waitlistEnabled,
    registrationOpen,
    requiredFields: event.requiredFields ?? [],
  });
}
