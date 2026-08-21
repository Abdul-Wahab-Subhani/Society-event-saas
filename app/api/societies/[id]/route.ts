import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Society } from "@/lib/db/models/Society";
import { getCurrentUser, assertSocietyRole, authErrorResponse } from "@/lib/auth/requireAuth";
import { societyUpdateSchema } from "@/lib/validation/society";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    assertSocietyRole(user, params.id, "organizer");

    const society = await Society.findById(params.id);
    if (!society) return NextResponse.json({ error: "Society not found" }, { status: 404 });

    return NextResponse.json(society);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** Certificate template + profile edits — admin only. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    assertSocietyRole(user, params.id, "admin");

    const body = await req.json().catch(() => null);
    const parsed = societyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const society = await Society.findByIdAndUpdate(params.id, parsed.data, { new: true });
    if (!society) return NextResponse.json({ error: "Society not found" }, { status: 404 });

    return NextResponse.json(society);
  } catch (err) {
    return authErrorResponse(err);
  }
}
