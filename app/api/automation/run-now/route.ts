import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { getCurrentUser, authErrorResponse, AuthError } from "@/lib/auth/requireAuth";
import { runAutomationSweep } from "@/lib/automation/engine";

/**
 * Same engine the cron route calls, gated by normal session auth instead
 * of CRON_SECRET — lets an organizer trigger a sweep on demand from the
 * dashboard (e.g. to test automation without waiting for the next tick).
 * Scoped to the caller's own societies (see runAutomationSweep) so
 * triggering a manual run never causes another society's events to fire
 * their automated actions early.
 */
export async function POST() {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();
    const societyIds = user.societies.map((m) => m.societyId.toString());
    const summary = await runAutomationSweep(societyIds);
    return NextResponse.json(summary);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err);
    console.error("Manual automation run failed", err);
    return NextResponse.json({ error: "Automation run failed" }, { status: 500 });
  }
}
