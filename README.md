# University Society & Event Management — Full Build

Next.js (App Router) + MongoDB/Mongoose + JWT auth + QR attendance + PDFKit
certificates + a cron-driven automation engine that runs the full event
lifecycle without an organizer touching anything after publish.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

You'll need:
- A MongoDB Atlas cluster (`MONGODB_URI`)
- A [Resend](https://resend.com) API key (`RESEND_API_KEY`) and a verified sender (`EMAIL_FROM`)
- Two long random strings for `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- A random string for `CRON_SECRET`

## How the pieces fit together

| Concern | Where |
|---|---|
| Auth (signup/login/refresh/logout) | `app/api/auth/*`, `lib/auth/*` |
| Society/event CRUD | `app/api/societies/*`, `app/api/events/*` |
| Public registration + QR + waitlist | `app/api/public/events/[slug]/*`, `lib/security/qrToken.ts`, `lib/qr/*` |
| QR scanning / attendance | `app/api/events/[id]/scan`, `app/(dashboard)/dashboard/events/[id]/scan` |
| Certificates | `lib/certificates/generateCertificate.ts` (PDFKit) |
| **Automation engine** | `lib/automation/engine.ts` orchestrates `lib/automation/actions/*` |
| Cron trigger | `app/api/cron/automation-run` (Vercel Cron, see `vercel.json`) |
| Manual "run now" (testing) | `app/api/automation/run-now`, or `npm run automation:run` locally |
| Dashboard UI | `app/(dashboard)/dashboard/*` |
| Sentry | `sentry.*.config.ts`, wired into the cron route and email sends |

## The automation engine, in one paragraph

Every 15 minutes (`vercel.json`), Vercel Cron hits `/api/cron/automation-run`
with a bearer token checked against `CRON_SECRET`. That route calls
`runAutomationSweep()`, which loads every event that isn't long-completed
and runs it through: auto-publish → auto-close-registration (audit log
only — the actual block is enforced live in the register route) →
auto-transition-ongoing → send-reminders → auto-complete (which itself
chains certificate delivery and no-show follow-ups). Every action is
guarded by a `*SentAt` field or a status check on the specific record it
acts on — never by "did we already run this cron tick" — so a retried or
overlapping run never double-sends. Waitlist promotion is the one
exception: it fires synchronously from the cancellation route, not the
sweep, so a freed spot fills immediately rather than up to 15 minutes
later.

## Deploying

1. Push to GitHub, import into Vercel.
2. Add all `.env.example` vars as Vercel environment variables.
3. Vercel picks up `vercel.json`'s cron config automatically — confirm it
   in Project Settings → Cron Jobs after the first deploy.
4. Point `NEXT_PUBLIC_APP_URL` at your real Vercel URL (needed for
   cancellation links and the public event page's server-side fetch).

## What's intentionally out of scope (per the spec)

Payments, WhatsApp/SMS, multi-university subdomains, and a job queue
(Bull/Redis) — the automation engine is a deliberately simple cron-poll
model for MVP. See Section 6 of the scope doc.

## Known follow-ups worth doing before real traffic

- `Event.slug` collisions are astronomically unlikely (6 hex chars appended)
  but not impossible — add a retry-on-duplicate-key loop in the create route
  if you want it airtight.
- The QR scanner page assumes a rear camera (`facingMode: "environment"`);
  add a camera-switch control for organizers on laptops without one.
- `promoteFromWaitlist` sends one email per promotion serially — fine at
  student-society scale, but batch it if a single cancellation could ever
  free double-digit spots at once.
