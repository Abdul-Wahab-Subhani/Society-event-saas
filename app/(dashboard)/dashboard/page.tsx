"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client/apiFetch";
import { useToast } from "@/lib/client/toast";
import { StatusStamp } from "@/components/StatusStamp";

interface EventSummary {
  _id: string;
  title: string;
  status: "draft" | "published" | "ongoing" | "completed";
  date: string;
  venue: string;
  registeredCount: number;
  capacity: number;
}

interface Me {
  id: string;
  name: string;
  societies: { societyId: string; role: string }[];
}

export default function DashboardHome() {
  const { push } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: Me) => {
        setMe(data);
        setSocietyId(data.societies[0]?.societyId ?? null);
      })
      .catch(() => push("Couldn't load your account — try refreshing.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!societyId) return;
    apiFetch(`/api/events?societyId=${societyId}`)
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => push("Couldn't load your events — try refreshing.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-medium tracking-tight">Events</h1>
          <p className="text-sm text-ink-muted">
            {me ? `Welcome back, ${me.name}.` : <span className="skeleton inline-block h-4 w-40 align-middle" />}
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-marigold px-4 py-2 text-sm font-medium text-ink transition hover:bg-marigold-dark hover:text-paper"
        >
          {showCreate ? "Cancel" : "New event"}
        </button>
      </div>

      {showCreate && societyId && (
        <CreateEventForm
          societyId={societyId}
          onCreated={(ev) => {
            setEvents((prev) => (prev ? [ev, ...prev] : [ev]));
            setShowCreate(false);
            push(`"${ev.title}" saved as a draft.`, "success");
          }}
        />
      )}

      <div className="space-y-3">
        {events === null &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-[68px] rounded-card" />
          ))}

        {events?.length === 0 && (
          <div className="rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
            <p className="font-display text-base font-medium">No events yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
              Create one above — it starts as a draft, and nothing goes out to
              students until you publish it.
            </p>
          </div>
        )}

        {events?.map((ev) => (
          <Link
            key={ev._id}
            href={`/dashboard/events/${ev._id}`}
            className="ticket-edge flex items-center justify-between rounded-card border border-line bg-surface py-4 pl-7 pr-5 transition hover:border-chalkboard/30"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-medium">{ev.title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {new Date(ev.date).toLocaleDateString("en-US", { dateStyle: "medium" })} · {ev.venue}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 pl-4">
              <span className="font-mono text-xs text-ink-muted">
                {ev.registeredCount}/{ev.capacity}
              </span>
              <StatusStamp status={ev.status} pulse={ev.status === "ongoing"} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CreateEventForm({
  societyId,
  onCreated,
}: {
  societyId: string;
  onCreated: (event: EventSummary) => void;
}) {
  const { push } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    const payload = {
      title: form.get("title"),
      description: form.get("description") ?? "",
      date: new Date(form.get("date") as string).toISOString(),
      endTime: new Date(form.get("endTime") as string).toISOString(),
      venue: form.get("venue"),
      capacity: Number(form.get("capacity")),
      waitlistEnabled: form.get("waitlistEnabled") === "on",
      reminderHoursBefore: [24, 2],
      requiredFields: [],
    };

    try {
      const res = await fetch(`/api/events?societyId=${societyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create the event — check the fields above.");
        setSubmitting(false);
        return;
      }
      onCreated(data);
    } catch {
      push("Network error — the event wasn't saved. Try again.", "error");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">New event · draft</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Title" name="title" required className="sm:col-span-2" />
        <Field label="Venue" name="venue" required />
        <Field label="Capacity" name="capacity" type="number" required />
        <Field label="Starts" name="date" type="datetime-local" required />
        <Field label="Ends" name="endTime" type="datetime-local" required />
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" name="waitlistEnabled" defaultChecked className="accent-chalkboard" />
          Enable waitlist when full
        </label>
        {error && (
          <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-chalkboard px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-chalkboard-light disabled:opacity-50 sm:col-span-2"
        >
          {submitting ? "Saving…" : "Create draft"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-chalkboard focus:outline-none"
      />
    </label>
  );
}
