import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentUser } from "@/lib/auth/requireAuth";
import { clearAuthCookies } from "@/lib/auth/session";

export async function POST() {
  await connectToDatabase();

  try {
    const user = await getCurrentUser();
    user.refreshTokenHash = null; // invalidates any outstanding refresh token
    await user.save();
  } catch {
    // Already logged out / expired session — clearing cookies is enough.
  }

  clearAuthCookies();
  return NextResponse.json({ ok: true });
}
