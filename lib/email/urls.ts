export function buildCancelUrl(qrToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/api/public/registrations/${qrToken}/cancel`;
}
