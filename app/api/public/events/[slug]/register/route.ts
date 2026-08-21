import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Event } from "@/lib/db/models/Event";
import { Registration } from "@/lib/db/models/Registration";
import { registrationSchema, findMissingRequiredFields } from "@/lib/validation/registration";
import { generateQrToken } from "@/lib/security/qrToken";
import { generateQrPngBuffer } from "@/lib/qr/generateQrImage";
import { registrationConfirmationTemplate } from "@/lib/email/templates/registrationConfirmation";
import { sendEmailSafe } from "@/lib/email/send";
import { buildCancelUrl } from "@/lib/email/urls";

/**
 * Public — no auth. The only place a Registration is ever created. Never
 * accepts a client-supplied status — this route decides registered vs.
 * waitlisted itself from live, atomically-guarded capacity counters.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  await connectToDatabase();

  const body = await req.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const event = await Event.findOne({ slug: params.slug });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (event.status !== "published") {
    return NextResponse.json({ error: "Registration is not open for this event" }, { status: 400 });
  }
  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    return NextResponse.json({ error: "Registration has closed for this event" }, { status: 400 });
  }

  const missing = findMissingRequiredFields(input, event.requiredFields ?? []);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required field(s): ${missing.join(", ")}` }, { status: 400 });
  }

  const existing = await Registration.findOne({ eventId: event._id, email: input.email });
  if (existing) {
    return NextResponse.json({ error: "This email is already registered for this event" }, { status: 409 });
  }

  // Atomic, conditional increment — the only place capacity is decided.
  // If two requests race for the last spot, exactly one matches the $lt
  // condition; the other falls through to the waitlist path.
  const promoted = await Event.findOneAndUpdate(
    { _id: event._id, registeredCount: { $lt: event.capacity } },
    { $inc: { registeredCount: 1 } },
    { new: true }
  );

  let status: "registered" | "waitlisted";
  let waitlistPosition: number | null = null;

  if (promoted) {
    status = "registered";
  } else if (event.waitlistEnabled) {
    const withWaitlist = await Event.findOneAndUpdate(
      { _id: event._id },
      { $inc: { waitlistCount: 1 } },
      { new: true }
    );
    status = "waitlisted";
    waitlistPosition = withWaitlist?.waitlistCount ?? null;
  } else {
    return NextResponse.json({ error: "This event is full" }, { status: 409 });
  }

  const qrToken = generateQrToken();
  let registration;
  try {
    registration = await Registration.create({
      eventId: event._id,
      name: input.name,
      email: input.email,
      universityId: input.universityId,
      phone: input.phone,
      qrToken,
      status,
      waitlistPosition,
    });
  } catch {
    // Unique (eventId, email) index caught a race the pre-check missed —
    // roll back the counter we just claimed.
    await Event.findByIdAndUpdate(event._id, {
      $inc: status === "registered" ? { registeredCount: -1 } : { waitlistCount: -1 },
    });
    return NextResponse.json({ error: "This email is already registered for this event" }, { status: 409 });
  }

  const { subject, html } = registrationConfirmationTemplate({
    attendeeName: input.name,
    eventTitle: event.title,
    eventDate: event.date,
    venue: event.venue,
    isWaitlisted: status === "waitlisted",
    waitlistPosition,
    cancelUrl: buildCancelUrl(qrToken),
  });

  // Best-effort: a delivery failure shouldn't undo a successful
  // registration. The organizer's manual re-send / Sentry log covers it.
  try {
    const qrBuffer = status === "registered" ? await generateQrPngBuffer(qrToken) : null;
    await sendEmailSafe({
      to: input.email,
      subject,
      html,
      attachments: qrBuffer ? [{ filename: "qr-code.png", content: qrBuffer }] : undefined,
    });
  } catch (err) {
    console.error("Failed to send registration confirmation email", err);
  }

  return NextResponse.json(
    { registrationId: registration._id, status: registration.status, waitlistPosition: registration.waitlistPosition },
    { status: 201 }
  );
}
