"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client/apiFetch";
import { useToast } from "@/lib/client/toast";
import { StatusStamp } from "@/components/StatusStamp";

interface EventDetail {
  _id: string;
  title: string;
  status: "draft" | "published" | "ongoing" | "completed";
  slug: string;
  date: string;
  venue: string;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
}

interface RegistrationRow {
  _id: string;
  name: string;
  email: string;
  status: string;
  waitlistPosition: number | null;
  certificateSentAt: string | null;
}

interface LogRow {
  _id: string;
  actionType: string;
  recipientCount: number;
  runAt: string;
  status: "success" | "partial" | "failed";
  errorDetail?: string;
}

const NEXT_STATUS: Record<string, string | null> = {
  draft: "published",
  published: "ongoing",
  ongoing: "completed",
  completed: null,
};

const LOG_DOT_COLOR: Record<string, string> = {
  success: "bg-success text-success",
  partial: "bg-marigold-dark text-marigold-dark",
  failed: "bg-danger text-danger",
};

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { push } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[] | null>(null);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [tab, setTab] = useState<"registrants" | "log">("registrants");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [eventRes, regRes, logRes] = await Promise.all([
      apiFetch(`/api/events/${params.id}`),
      apiFetch(`/api/events/${params.id}/registrations`),
      apiFetch(`/api/events/${params.id}/automation-log`),
    ]);
    if (eventRes.ok) setEvent(await eventRes.json());
    if (regRes.ok) setRegistrations((await regRes.json()).registrations);
    if (logRes.ok) setLogs(await logRes.json());
  }, [params.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (event?.status !== "ongoing") return;
    const interval = setInterval(loadAll, 10_000);
    return () => clearInterval(interval);
  }, [event?.status, loadAll]);

  async function advanceStatus() {
    if (!event) return;
    const next = NEXT_STATUS[event.status];
    if (!next) return;
    setBusy(true);
    const res = await apiFetch(`/api/events/${event._id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) {
      push(`Event marked ${next}.`, "success");
      loadAll();
    } else {
      push("Couldn't update the event status.", "error");
    }
  }

  async function resendCertificate(registrationId: string, name: string) {
    if (!event) return;
    const res = await apiFetch(`/api/events/${event._id}/certificates/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    push(res.ok ? `Certificate re-sent to ${name}.` : `Couldn't re-send to ${name}.`, res.ok ? "success" : "error");
    loadAll();
  }

  async function runAutomationNow() {
    setBusy(true);
    const res = await apiFetch("/api/automation/run-now", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    push(
      res.ok ? `Sweep complete — ${data.eventsProcessed} event(s) checked.` : "Automation run failed.",
      res.ok ? "success" : "error"
    );
    loadAll();
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-card" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-card" />
      </div>
    );
  }

  const attendedCount = (registrations ?? []).filter((r) => r.status === "attended").length;
  const filtered = filter === "all" ? registrations ?? [] : (registrations ?? []).filter((r) => r.status === filter);
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-ink-muted hover:text-ink">
        ← Back
      </Link>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-medium tracking-tight">{event.title}</h1>
            <StatusStamp status={event.status} pulse={event.status === "ongoing"} />
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{event.venue}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/events/${event._id}/scan`}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:border-chalkboard/30"
          >
            Scan QR
          </Link>
          {NEXT_STATUS[event.status] && (
            <button
              onClick={advanceStatus}
              disabled={busy}
              className="rounded-lg bg-chalkboard px-3 py-2 text-sm font-medium text-paper transition hover:bg-chalkboard-light disabled:opacity-50"
            >
              Mark {NEXT_STATUS[event.status]}
            </button>
          )}
        </div>
      </div>

      {event.status === "published" && (
        <p className="mt-3 truncate font-mono text-xs text-ink-muted">
          {publicUrl}{" "}
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-chalkboard underline">
            open ↗
          </a>
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Registered" value={`${event.registeredCount}/${event.capacity}`} />
        <StatCard label="Waitlisted" value={String(event.waitlistCount)} />
        <StatCard label="Attended" value={String(attendedCount)} />
        <StatCard
          label="Attendance rate"
          value={event.registeredCount > 0 ? `${Math.round((attendedCount / event.registeredCount) * 100)}%` : "—"}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-b border-line">
        <TabButton active={tab === "registrants"} onClick={() => setTab("registrants")}>
          Registrants
        </TabButton>
        <TabButton active={tab === "log"} onClick={() => setTab("log")}>
          Automation log
        </TabButton>
        <div className="ml-auto flex gap-4 pb-2">
          <button onClick={runAutomationNow} disabled={busy} className="text-xs text-ink-muted underline decoration-line underline-offset-4 hover:text-ink disabled:opacity-50">
            Run automation now
          </button>
          <a href={`/api/events/${event._id}/registrations?format=csv`} className="text-xs text-ink-muted underline decoration-line underline-offset-4 hover:text-ink">
            Export CSV
          </a>
        </div>
      </div>

      {tab === "registrants" ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {["all", "registered", "waitlisted", "attended", "no-show", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition ${
                  filter === s ? "bg-chalkboard text-paper" : "bg-surface text-ink-muted hover:bg-line/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {registrations === null ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card border border-line bg-surface">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3">Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Certificate</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r._id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="text-ink-muted">{r.email}</td>
                      <td>
                        {r.status}
                        {r.status === "waitlisted" && r.waitlistPosition ? ` #${r.waitlistPosition}` : ""}
                      </td>
                      <td className="text-ink-muted">{r.certificateSentAt ? "Sent" : "—"}</td>
                      <td className="pr-4">
                        {r.status === "attended" && (
                          <button
                            onClick={() => resendCertificate(r._id, r.name)}
                            className="font-mono text-xs text-chalkboard underline decoration-line underline-offset-4"
                          >
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-ink-muted">
                        No registrants in this filter yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {logs === null ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              Nothing has run yet — automated actions will appear here once this event is published.
            </p>
          ) : (
            <div className="log-timeline space-y-5">
              {logs.map((log) => (
                <div key={log._id} className="relative">
                  <span className={`log-dot ${log.status === "success" ? "log-dot--pulse" : ""} ${LOG_DOT_COLOR[log.status] ?? "bg-ink-muted text-ink-muted"}`} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium capitalize">{log.actionType.replace(/_/g, " ")}</p>
                    <span className={`stamp ${(LOG_DOT_COLOR[log.status] ?? "text-ink-muted").split(" ")[1] ?? "text-ink-muted"}`}>{log.status}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-ink-muted">
                    {new Date(log.runAt).toLocaleString("en-US")} · {log.recipientCount} recipient(s)
                    {log.errorDetail ? ` · ${log.errorDetail}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-medium">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 pb-2 text-sm font-medium transition ${
        active ? "border-marigold text-ink" : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
