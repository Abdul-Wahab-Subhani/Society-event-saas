"use client";

import { useState, type FormEvent } from "react";

interface RegistrationFormProps {
  slug: string;
  requiredFields: string[];
  full: boolean;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; status: "registered" | "waitlisted"; waitlistPosition: number | null }
  | { kind: "error"; message: string };

export function RegistrationForm({ slug, requiredFields, full }: RegistrationFormProps) {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "submitting" });

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      universityId: form.get("universityId") || undefined,
      phone: form.get("phone") || undefined,
    };

    try {
      const res = await fetch(`/api/public/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({ kind: "error", message: data.error ?? "Something went wrong" });
        return;
      }

      setState({ kind: "success", status: data.status, waitlistPosition: data.waitlistPosition });
    } catch {
      setState({ kind: "error", message: "Network error — please try again" });
    }
  }

  if (state.kind === "success") {
    return (
      <div className="ticket-edge rounded-card border border-line bg-paper py-5 pl-8 pr-5">
        <span className={`stamp ${state.status === "registered" ? "text-success" : "text-marigold-dark"}`}>
          {state.status === "registered" ? "You're in" : "Waitlisted"}
        </span>
        <p className="mt-2 text-sm text-ink">
          {state.status === "registered" ? (
            <>Check your email for your QR code — show it at the entrance.</>
          ) : (
            <>You're #{state.waitlistPosition ?? "-"} on the waitlist. We'll email you the moment a spot opens up.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Full name" name="name" required />
      <Field label="Email" name="email" type="email" required />
      {requiredFields.includes("universityId") && <Field label="University ID" name="universityId" required />}
      {requiredFields.includes("phone") && <Field label="Phone" name="phone" type="tel" required />}

      {state.kind === "error" && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={state.kind === "submitting" || full}
        className="w-full rounded-lg bg-marigold px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-marigold-dark hover:text-paper disabled:opacity-50"
      >
        {full ? "Event full" : state.kind === "submitting" ? "Registering…" : "Register"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
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
