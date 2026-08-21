import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { Society } from "@/lib/db/models/Society";
import { getCurrentUser, authErrorResponse } from "@/lib/auth/requireAuth";

/** Lists the societies the current user belongs to. */
export async function GET() {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    const societyIds = user.societies.map((m) => m.societyId);
    const societies = await Society.find({ _id: { $in: societyIds } });

    const withRole = societies.map((s) => ({
      ...s.toObject(),
      role: user.societies.find((m) => m.societyId.toString() === s._id.toString())?.role,
    }));

    return NextResponse.json(withRole);
  } catch (err) {
    return authErrorResponse(err);
  }
}
