import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { User, type UserDocument, type SocietyRole } from "@/lib/db/models/User";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { getAccessTokenCookie } from "@/lib/auth/session";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Resolves the current authenticated user from the access token cookie.
 * Throws AuthError (401) if missing/invalid/expired — callers should let
 * this propagate up to a try/catch that maps it to a JSON response, or use
 * requireAuth() below which does that for you.
 */
export async function getCurrentUser(): Promise<UserDocument> {
  const token = getAccessTokenCookie();
  if (!token) throw new AuthError("Not authenticated");

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AuthError("Session expired");
  }

  await connectToDatabase();
  const user = await User.findById(payload.sub);
  if (!user) throw new AuthError("User not found");
  return user;
}

/**
 * Requires the current user to hold `role` (or 'admin', which can act as
 * 'organizer' too) on the given society. Throws AuthError(403) otherwise.
 * Use this at the top of every organizer/admin-scoped route handler.
 */
export function assertSocietyRole(
  user: UserDocument,
  societyId: string,
  minRole: SocietyRole
): void {
  const membership = user.societies.find((m) => m.societyId.toString() === societyId);
  if (!membership) throw new AuthError("Not a member of this society", 403);
  if (minRole === "organizer") return; // both admin and organizer satisfy this
  if (membership.role !== "admin") throw new AuthError("Requires admin role", 403);
}

/** Maps an AuthError (or unexpected error) to a JSON response. */
export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
