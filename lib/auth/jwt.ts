import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set");
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export interface AccessTokenPayload {
  sub: string; // userId
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string; // userId
  type: "refresh";
  jti: string; // unique per issuance, so we can hash+store it for rotation checks
}

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId, type: "access" };
  return jwt.sign(payload, ACCESS_SECRET as string, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { sub: userId, type: "refresh", jti };
  return jwt.sign(payload, REFRESH_SECRET as string, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET as string) as AccessTokenPayload;
  if (decoded.type !== "access") throw new Error("Not an access token");
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET as string) as RefreshTokenPayload;
  if (decoded.type !== "refresh") throw new Error("Not a refresh token");
  return decoded;
}
