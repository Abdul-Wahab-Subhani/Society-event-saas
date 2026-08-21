import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";
import { eventCreateSchema } from "@/lib/validation/event";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/** Lists events for a society (?societyId=...). */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const societyId = req.nextUrl.searchParams.get("societyId");
    if (!societyId) {
      return NextResponse.json({ error: "societyId is required" }, { status: 400 });
    }
    assertSocietyRole(user, societyId, "organizer");

    const events = await Event.find({ societyId }).sort({ date: -1 });
    return NextResponse.json(events);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const societyId = req.nextUrl.searchParams.get("societyId");
    if (!societyId) {
      return NextResponse.json({ error: "societyId is required" }, { status: 400 });
    }
    assertSocietyRole(user, societyId, "organizer");

    const body = await req.json().catch(() => null);
    const parsed = eventCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Status is always "draft" on creation — never accepted from the
    // client, per the coding standard that status transitions only come
    // from an authenticated organizer action or the automation engine.
    const event = await Event.create({
      ...parsed.data,
      societyId,
      slug: slugify(parsed.data.title),
      status: "draft",
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
