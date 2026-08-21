/**
 * Wraps fetch for dashboard client components: on a 401 (expired access
 * token), tries POST /api/auth/refresh once and retries the original
 * request. If refresh also fails, sends the user back to /login rather
 * than leaving them looking at a silently-broken page.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
  if (!refreshRes.ok) {
    window.location.href = "/login";
    return res;
  }

  return fetch(input, init);
}
