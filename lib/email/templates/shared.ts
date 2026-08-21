export function emailShell(innerHtml: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
      ${innerHtml}
    </div>
  `;
}

export function infoRow(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;white-space:nowrap;">${label}</td><td style="font-size:13px;">${value}</td></tr>`;
}

export function calloutBox(text: string, tone: "success" | "warning" | "neutral"): string {
  const styles = {
    success: "color:#0f5132;background:#e9f7ef;",
    warning: "color:#7a5c00;background:#fff8e1;",
    neutral: "color:#333;background:#f2f2f2;",
  }[tone];
  return `<p style="margin:0 0 16px;padding:12px 16px;border-radius:8px;${styles}">${text}</p>`;
}
