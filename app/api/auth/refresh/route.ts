import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { getRefreshTokenCookie, setAuthCookies, clearAuthCookies } from "@/lib/auth/session";

export async function POST() {
  await connectToDatabase();

  const token = getRefreshTokenCookie();
  if (!token) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies();
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }

  const user = await User.findById(payload.sub);

  // Rotation check: the jti in the token must match the one currently on
  // file. A mismatch means this refresh token was already rotated away
  // (e.g. reused after a prior refresh, or stolen and used out-of-band) —
  // treat it as a compromise signal and invalidate the whole session.
  if (!user || user.refreshTokenHash !== payload.jti) {
    if (user) {
      user.refreshTokenHash = null;
      await user.save();
    }
    clearAuthCookies();
    return NextResponse.json({ error: "Session invalidated — please log in again" }, { status: 401 });
  }

  const newJti = randomUUID();
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString(), newJti);

  user.refreshTokenHash = newJti;
  await user.save();

  setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({ ok: true });
}
