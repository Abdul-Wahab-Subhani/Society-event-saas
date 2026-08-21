import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { runAutomationSweep } from "@/lib/automation/engine";

/**
 * Vercel Cron hits this every 15 min (see vercel.json). CRON_SECRET is
 * checked so the endpoint can't be triggered by anyone who guesses the URL.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAutomationSweep();

    if (summary.erroredEventIds.length > 0) {
      Sentry.captureMessage("Automation sweep had per-event failures", {
        tags: { automation: "true" },
        extra: { erroredEventIds: summary.erroredEventIds },
      });
    }

    return NextResponse.json(summary);
  } catch (err) {
    Sentry.captureException(err, { tags: { automation: "true" } });
    console.error("Automation sweep failed entirely", err);
    return NextResponse.json({ error: "Automation sweep failed" }, { status: 500 });
  }
}
