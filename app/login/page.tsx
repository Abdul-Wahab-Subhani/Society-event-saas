"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/client/toast";

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login"
        ? { email: form.get("email"), password: form.get("password") }
        : {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            societyName: form.get("societyName"),
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFieldError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      push("Couldn't reach the server — check your connection and try again.", "error");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Hero panel — the "it runs itself" thesis, front and center. */}
      <section className="hidden flex-col justify-between bg-chalkboard p-12 text-paper lg:flex">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-paper/60">
          Society Events
        </span>
        <div>
          <h1 className="max-w-md font-display text-4xl font-medium leading-[1.15] tracking-tight">
            Publish an event once.
            <br />
            Let it run itself.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/70">
            Registration, reminders, check-in, certificates, waitlist promotion —
            handled automatically from the moment you hit publish to the moment
            the last certificate lands in an inbox.
          </p>
        </div>
        <p className="font-mono text-xs text-paper/40">
          Built for student societies who are done copying names between
          Google Forms and Canva.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted lg:hidden">
            Society Events
          </p>
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {mode === "login" ? "Log in" : "Set up your society"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === "login" ? "Welcome back." : "Takes under a minute — no credit card, no approval wait."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Your name" name="name" required />
                <Field label="Society name" name="societyName" required />
              </>
            )}
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required minLength={8} />

            {fieldError && (
              <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{fieldError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-chalkboard px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-chalkboard-light disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-5 text-sm text-ink-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-chalkboard focus:outline-none"
      />
    </label>
  );
}
