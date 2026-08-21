const STATUS_COLOR: Record<string, string> = {
  draft: "text-ink-muted",
  published: "text-chalkboard",
  ongoing: "text-marigold-dark",
  completed: "text-success",
  registered: "text-chalkboard",
  waitlisted: "text-marigold-dark",
  attended: "text-success",
  "no-show": "text-danger",
  cancelled: "text-ink-muted",
  success: "text-success",
  partial: "text-marigold-dark",
  failed: "text-danger",
};

export function StatusStamp({ status, pulse = false }: { status: string; pulse?: boolean }) {
  return (
    <span className={`stamp ${STATUS_COLOR[status] ?? "text-ink-muted"} relative`}>
      {pulse && <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>}
      {status}
    </span>
  );
}
