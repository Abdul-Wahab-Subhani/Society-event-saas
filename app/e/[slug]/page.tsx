import { notFound } from "next/navigation";
import { RegistrationForm } from "./RegistrationForm";

interface PublicEvent {
  title: string;
  description: string;
  date: string;
  venue: string;
  bannerUrl?: string;
  society: { name: string; logo?: string };
  spotsLeft: number;
  capacity: number;
  waitlistEnabled: boolean;
  registrationOpen: boolean;
  requiredFields: string[];
}

async function getEvent(slug: string): Promise<PublicEvent | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await fetch(`${base}/api/public/events/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load event");
  return res.json();
}

export default async function PublicEventPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event) notFound();

  const formattedDate = new Date(event.date).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative flex h-48 items-end overflow-hidden bg-chalkboard sm:h-64">
        {event.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: "radial-gradient(circle, #F7F7F4 1.5px, transparent 1.5px)",
              backgroundSize: "18px 18px",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-chalkboard/90 via-transparent to-transparent" />
        <div className="relative mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-paper/70">{event.society.name}</p>
          <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-paper sm:text-4xl">
            {event.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">When</dt>
            <dd className="mt-0.5">{formattedDate}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">Where</dt>
            <dd className="mt-0.5">{event.venue}</dd>
          </div>
        </dl>

        {event.description && (
          <p className="mt-6 whitespace-pre-line leading-relaxed text-ink/90">{event.description}</p>
        )}

        <div className="mt-8 rounded-card border border-line bg-surface p-6">
          {!event.registrationOpen ? (
            <p className="text-sm font-medium text-ink-muted">Registration is closed for this event.</p>
          ) : (
            <>
              <p className="mb-4 font-mono text-xs uppercase tracking-wide text-ink-muted">
                {event.spotsLeft > 0
                  ? `${event.spotsLeft} of ${event.capacity} spots left`
                  : event.waitlistEnabled
                  ? "Full — new registrations join the waitlist"
                  : "Event is full"}
              </p>
              <RegistrationForm
                slug={params.slug}
                requiredFields={event.requiredFields}
                full={event.spotsLeft === 0 && !event.waitlistEnabled}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
