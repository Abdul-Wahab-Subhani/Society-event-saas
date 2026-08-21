import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";

const CSV_COLUMNS = [
  "name",
  "email",
  "universityId",
  "phone",
  "status",
  "waitlistPosition",
  "createdAt",
] as const;

type CsvRow = Partial<Record<(typeof CSV_COLUMNS)[number], unknown>>;

function toCsv(rows: CsvRow[]): string {
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) => CSV_COLUMNS.map((col) => escape(row[col])).join(","));
  return [header, ...lines].join("\n");
}

/**
 * GET /api/events/[id]/registrations
 * GET /api/events/[id]/registrations?format=csv        -> CSV download
 * GET /api/events/[id]/registrations?status=attended    -> filter
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    const event = await Event.findById(params.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    assertSocietyRole(user, event.societyId.toString(), "organizer");

    const status = req.nextUrl.searchParams.get("status");
    const query: Record<string, unknown> = { eventId: event._id };
    if (status) query.status = status;

    const registrations = await Registration.find(query).sort({ createdAt: 1 });

    if (req.nextUrl.searchParams.get("format") === "csv") {
      const csv = toCsv(registrations.map((r) => r.toObject()));
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${event.slug}-registrations.csv"`,
        },
      });
    }

    return NextResponse.json({
      registrations,
      summary: {
        registeredCount: event.registeredCount,
        waitlistCount: event.waitlistCount,
        attendedCount: registrations.filter((r) => r.status === "attended").length,
        capacity: event.capacity,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
