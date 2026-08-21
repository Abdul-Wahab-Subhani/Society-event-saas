"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-chalkboard text-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="font-display text-sm font-medium tracking-tight">
            Society Events
          </Link>
          <button
            onClick={handleLogout}
            className="font-mono text-xs uppercase tracking-wide text-paper/60 transition hover:text-paper"
          >
            Log out
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
