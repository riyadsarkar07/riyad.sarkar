import "server-only";

/**
 * Secure server-side email via Resend.
 * Falls back to a no-op when RESEND_API_KEY is not configured so the rest of
 * the app works without email. The API key lives only on the server.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: true, skipped: true };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Riyad Sarkar <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, skipped: false, error: `Resend ${res.status}` };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : "email error",
    };
  }
}

const layout = (body: string) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#0b1220;padding:32px 16px;color:#e2e8f0">
    <div style="max-width:520px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(90deg,#2563eb,#06b6d4)">
        <strong style="font-size:18px;color:#fff">Riyad Sarkar</strong>
        <span style="float:right;font-size:12px;color:#e0f2fe">Cyber Security & Digital Recovery</span>
      </div>
      <div style="padding:24px">${body}</div>
      <div style="padding:16px 24px;border-top:1px solid #1e293b;font-size:12px;color:#64748b">
        This is an automated notification from riyadsarkar.com. Do not reply to this email.
      </div>
    </div>
  </div>
`;

const p = (text: string) => `<p style="margin:0 0 12px;line-height:1.6">${text}</p>`;

export function renderEmail(opts: {
  greeting: string;
  lines: string[];
  cta?: { label: string; href: string };
  footer?: string;
}) {
  const linesHtml = opts.lines.map((l) => p(l)).join("");
  const ctaHtml = opts.cta
    ? `<p style="margin:20px 0 0"><a href="${opts.cta.href}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:linear-gradient(90deg,#2563eb,#06b6d4);color:#fff;text-decoration:none;font-weight:600">${opts.cta.label}</a></p>`
    : "";
  return layout(`<h2 style="margin:0 0 16px;font-size:20px">${opts.greeting}</h2>${linesHtml}${ctaHtml}${opts.footer ? `<p style="margin:16px 0 0;font-size:12px;color:#64748b">${opts.footer}</p>` : ""}`);
}
