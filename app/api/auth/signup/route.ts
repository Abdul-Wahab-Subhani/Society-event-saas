import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { Society } from "@/lib/db/models/Society";
import { signupSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, email, password, societyName } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const society = await Society.create({ name: societyName, admins: [] });

  const user = await User.create({
    name,
    email,
    passwordHash,
    societies: [{ societyId: society._id, role: "admin" }],
  });

  society.admins = [user._id];
  await society.save();

  const jti = randomUUID();
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString(), jti);

  user.refreshTokenHash = jti; // storing the jti is sufficient since it's random+unguessable and single-use per rotation
  await user.save();

  setAuthCookies(accessToken, refreshToken);

  return NextResponse.json(
    { userId: user._id, societyId: society._id },
    { status: 201 }
  );
}
