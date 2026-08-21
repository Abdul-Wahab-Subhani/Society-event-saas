import { cookies } from "next/headers";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

const isProd = process.env.NODE_ENV === "production";

export function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 minutes, mirrors the access token TTL
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth", // only sent to auth routes — narrows exposure
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearAuthCookies() {
  const store = cookies();
  store.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
}

export function getAccessTokenCookie(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export function getRefreshTokenCookie(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
