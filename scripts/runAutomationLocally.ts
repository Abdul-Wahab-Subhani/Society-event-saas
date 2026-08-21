/**
 * Run with `npm run automation:run`. Useful for testing the engine without
 * waiting for the Vercel Cron interval or deploying — exercises the exact
 * same runAutomationSweep() the cron route and admin trigger call.
 */
import { runAutomationSweep } from "../lib/automation/engine";

runAutomationSweep()
  .then((summary) => {
    console.log("Automation sweep complete:", summary);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Automation sweep failed:", err);
    process.exit(1);
  });
