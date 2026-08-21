import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  // Same error for "no such user" and "wrong password" — don't leak which.
  const invalidResponse = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  if (!user) return invalidResponse;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return invalidResponse;

  const jti = randomUUID();
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString(), jti);

  user.refreshTokenHash = jti;
  await user.save();

  setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({ userId: user._id });
}
