import "server-only";

export type SendEmailCode =
  | "missing_key"
  | "auth"
  | "invalid_from"
  | "unverified_domain"
  | "restricted_testing"
  | "invalid_recipient"
  | "rate_limit"
  | "provider"
  | "network";

export type SendEmailResult = {
  ok: boolean;
  skipped: boolean;
  error?: string;
  code?: SendEmailCode;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TEST_FROM = "Riyad Sarkar <onboarding@resend.dev>";
const TEST_FROM_EMAIL = "onboarding@resend.dev";

const CONSUMER_OR_PLACEHOLDER_HOSTS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "example.com",
  "example.org",
  "example.net",
  "test.com",
]);

function readEnv(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^['"]+|['"]+$/g, "").trim();
}

function hostOf(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function parseAddress(raw: string): { name: string; email: string } | null {
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, "").trim();
  if (!cleaned) return null;

  const angled = cleaned.match(/^(.*?)\s*<([^<>]+)>$/);
  const email = (angled ? angled[2] : cleaned).trim().toLowerCase();
  const name = (angled ? angled[1] : "").trim().replace(/^['"]+|['"]+$/g, "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { name, email };
}

function formatFrom(name: string, email: string): string {
  return name ? `${name} <${email}>` : email;
}

function isUsableFromEmail(email: string): boolean {
  if (email === TEST_FROM_EMAIL) return true;
  return !CONSUMER_OR_PLACEHOLDER_HOSTS.has(hostOf(email));
}

function resolveFrom(): { from: string; email: string } {
  const configured = parseAddress(readEnv("RESEND_FROM_EMAIL"));
  if (configured && isUsableFromEmail(configured.email)) {
    return {
      from: formatFrom(configured.name || "Riyad Sarkar", configured.email),
      email: configured.email,
    };
  }

  if (configured) {
    console.error(
      "[contact-email] RESEND_FROM_EMAIL is not a Resend-accepted sender (consumer or placeholder domain). Falling back to onboarding@resend.dev. Verify a domain in Resend for production delivery.",
      { fromHost: hostOf(configured.email) },
    );
  }

  return { from: TEST_FROM, email: TEST_FROM_EMAIL };
}

function sanitizeProviderMessage(message: string): string {
  return message
    .replace(/re_[A-Za-z0-9_]+/g, "[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}

function classifyResendError(status: number, message: string): SendEmailCode {
  const text = message.toLowerCase();

  if (status === 401) return "auth";
  if (status === 403 && (text.includes("api key") || text.includes("unauthorized"))) {
    return "auth";
  }
  if (text.includes("testing email") || text.includes("own email address") || text.includes("only send testing")) {
    return "restricted_testing";
  }
  if (text.includes("not verified") || text.includes("verify your domain") || text.includes("domain is not")) {
    return "unverified_domain";
  }
  if (text.includes("from") && (text.includes("invalid") || text.includes("must be"))) {
    return "invalid_from";
  }
  if (text.includes("recipient") || text.includes("invalid `to`") || text.includes("invalid to")) {
    return "invalid_recipient";
  }
  if (status === 429 || text.includes("rate limit") || text.includes("too many")) {
    return "rate_limit";
  }
  if (status === 403) return "restricted_testing";
  if (status === 422) return "invalid_from";
  return "provider";
}

async function postResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  let res: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: opts.from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
  } catch (err) {
    const aborted =
      (err instanceof Error && err.name === "AbortError") ||
      (err instanceof DOMException && err.name === "AbortError");
    return {
      ok: false,
      skipped: false,
      code: "network",
      error: aborted ? "email request timed out" : err instanceof Error ? err.message : "network error",
    };
  } finally {
    clearTimeout(timer);
  }

  const payload = (await res.json().catch(() => null)) as
    | { id?: unknown; message?: unknown; name?: unknown; statusCode?: unknown }
    | null;

  if (!res.ok) {
    const message = typeof payload?.message === "string" ? payload.message : `Resend ${res.status}`;
    const code = classifyResendError(res.status, message);
    return {
      ok: false,
      skipped: false,
      code,
      error: `Resend ${res.status}: ${sanitizeProviderMessage(message)}`,
    };
  }

  if (typeof payload?.id !== "string" || payload.id.length === 0) {
    return {
      ok: false,
      skipped: false,
      code: "provider",
      error: "Resend did not confirm acceptance",
    };
  }

  return { ok: true, skipped: false };
}

/**
 * Secure server-side email via Resend.
 * Falls back to a no-op when RESEND_API_KEY is not configured so the rest of
 * the app works without email. The API key lives only on the server.
 */
function envPresence() {
  const apiKey = readEnv("RESEND_API_KEY");
  return {
    RESEND_API_KEY: apiKey.length > 0,
    RESEND_API_KEY_PREFIX_OK: apiKey.startsWith("re_"),
    RESEND_FROM_EMAIL: readEnv("RESEND_FROM_EMAIL").length > 0,
    RESEND_TO_EMAIL: readEnv("RESEND_TO_EMAIL").length > 0,
    NEXT_PUBLIC_ADMIN_EMAIL: readEnv("NEXT_PUBLIC_ADMIN_EMAIL").length > 0,
    NEXT_PUBLIC_PROFILE_EMAIL: readEnv("NEXT_PUBLIC_PROFILE_EMAIL").length > 0,
  };
}

export function adminInbox(): string {
  return (
    readEnv("RESEND_TO_EMAIL") ||
    readEnv("NEXT_PUBLIC_ADMIN_EMAIL") ||
    readEnv("NEXT_PUBLIC_PROFILE_EMAIL") ||
    "riyadsarkar1243@gmail.com"
  );
}

export function publicErrorFor(code?: SendEmailCode): string {
  const inbox = "riyadsarkar1243@gmail.com";
  switch (code) {
    case "missing_key":
      return `Email delivery is not configured yet. Please email me directly at ${inbox}.`;
    case "auth":
      return `Email delivery is not authorized. Please email me directly at ${inbox}.`;
    case "invalid_from":
    case "unverified_domain":
      return `The sender is not verified yet. Please email me directly at ${inbox}.`;
    case "restricted_testing":
      return `Resend is still in test mode, so it can only deliver to the account owner's inbox. Please email me directly at ${inbox}.`;
    case "invalid_recipient":
      return `The contact inbox is not configured correctly. Please email me directly at ${inbox}.`;
    case "rate_limit":
      return "Too many messages were sent just now. Please wait a minute and try again.";
    case "network":
      return "The email service could not be reached. Please try again or email me directly.";
    default:
      return `The message could not be delivered. Please try again or email me directly at ${inbox}.`;
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[contact-email] RESEND_API_KEY is missing", envPresence());
    return { ok: false, skipped: true, code: "missing_key" };
  }

  const toParsed = parseAddress(opts.to);
  if (!toParsed) {
    console.error("[contact-email] invalid recipient address");
    return { ok: false, skipped: false, code: "invalid_recipient", error: "invalid recipient" };
  }

  const resolved = resolveFrom();
  const replyTo = opts.replyTo ? parseAddress(opts.replyTo)?.email : undefined;

  const result = await postResend({
    apiKey,
    from: resolved.from,
    to: toParsed.email,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo,
  });

  if (result.ok) return result;

  const canRetryOnboarding =
    resolved.email !== TEST_FROM_EMAIL &&
    (result.code === "unverified_domain" || result.code === "invalid_from");

  if (canRetryOnboarding) {
    console.error(
      "[contact-email] configured sender rejected; retrying with onboarding@resend.dev",
      { code: result.code, fromHost: hostOf(resolved.email), toHost: hostOf(toParsed.email) },
    );
    const retry = await postResend({
      apiKey,
      from: TEST_FROM,
      to: toParsed.email,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo,
    });
    if (retry.ok) return retry;
    console.error("[contact-email] resend failed", {
      code: retry.code,
      error: retry.error,
      fromHost: "resend.dev",
      toHost: hostOf(toParsed.email),
      env: envPresence(),
    });
    return retry;
  }

  console.error("[contact-email] resend failed", {
    code: result.code,
    error: result.error,
    fromHost: hostOf(resolved.email),
    toHost: hostOf(toParsed.email),
    env: envPresence(),
  });
  return result;
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
