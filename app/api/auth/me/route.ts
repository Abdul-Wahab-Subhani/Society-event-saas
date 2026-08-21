import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentUser, authErrorResponse } from "@/lib/auth/requireAuth";

export async function GET() {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      societies: user.societies,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
