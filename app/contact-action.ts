"use server";

import { headers } from "next/headers";
import { renderEmail, sendEmail } from "@/lib/email";
import {
  contactFormSchema,
  type ContactActionResult,
  type ContactFormValues,
} from "@/lib/contact-schema";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ??
  process.env.NEXT_PUBLIC_PROFILE_EMAIL ??
  "riyadsarkar1243@gmail.com";

const MIN_SUBMIT_MS = 2500;
const EMAIL_COOLDOWN_MS = 60_000;
const IP_WINDOW_MS = 15 * 60_000;
const IP_MAX = 5;

const recentByEmail = new Map<string, number>();
const recentByIp = new Map<string, number[]>();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pruneMaps(now: number) {
  for (const [key, ts] of recentByEmail) {
    if (now - ts > EMAIL_COOLDOWN_MS) recentByEmail.delete(key);
  }
  for (const [ip, stamps] of recentByIp) {
    const fresh = stamps.filter((t) => now - t < IP_WINDOW_MS);
    if (fresh.length === 0) recentByIp.delete(ip);
    else recentByIp.set(ip, fresh);
  }
}

function isRateLimited(email: string, ip: string, now: number): boolean {
  pruneMaps(now);
  if ((recentByEmail.get(email) ?? 0) > now - EMAIL_COOLDOWN_MS) return true;
  const stamps = recentByIp.get(ip) ?? [];
  return stamps.length >= IP_MAX;
}

function markSubmitted(email: string, ip: string, now: number) {
  recentByEmail.set(email, now);
  const stamps = recentByIp.get(ip) ?? [];
  stamps.push(now);
  recentByIp.set(ip, stamps);
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

async function sendViaEmailJs(data: ContactFormValues): Promise<boolean> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) return false;

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        from_name: data.name,
        from_email: data.email,
        phone: "",
        service: data.projectType,
        project_type: data.projectType,
        budget: data.budget || "Not specified",
        timeline: data.timeline || "Not specified",
        date: new Date().toISOString(),
        time: "",
        message: data.message,
        to_name: "Riyad Sarkar",
        reply_to: data.email,
      },
    }),
  });

  return res.ok;
}

export async function submitContactAction(
  input: ContactFormValues,
): Promise<ContactActionResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  const now = Date.now();

  if (data.website && data.website.trim().length > 0) {
    return { ok: false, error: "Unable to send right now. Please email me directly." };
  }

  if (typeof data.startedAt === "number" && now - data.startedAt < MIN_SUBMIT_MS) {
    return { ok: false, error: "Unable to send right now. Please try again." };
  }

  const ip = await clientIp();
  const emailKey = data.email.toLowerCase();
  if (isRateLimited(emailKey, ip, now)) {
    return {
      ok: false,
      error: "Please wait a moment before sending another message.",
    };
  }

  const budget = data.budget && data.budget.length > 0 ? data.budget : "Not specified";
  const timeline = data.timeline && data.timeline.length > 0 ? data.timeline : "Not specified";
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeType = escapeHtml(data.projectType);
  const safeBudget = escapeHtml(budget);
  const safeTimeline = escapeHtml(timeline);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, "<br/>");

  const html = renderEmail({
    greeting: "New project enquiry",
    lines: [
      `<strong>${safeName}</strong> (${safeEmail})`,
      `Project type: ${safeType}`,
      `Budget: ${safeBudget} · Timeline: ${safeTimeline}`,
      `Message:<br/>${safeMessage}`,
    ],
  });

  const text = [
    `New project enquiry from ${data.name} <${data.email}>`,
    `Project type: ${data.projectType}`,
    `Budget: ${budget}`,
    `Timeline: ${timeline}`,
    "",
    data.message,
  ].join("\n");

  const resend = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Project enquiry — ${data.projectType} — ${data.name}`,
    html,
    text,
    replyTo: data.email,
  });

  if (resend.ok && !resend.skipped) {
    markSubmitted(emailKey, ip, now);
    return { ok: true };
  }

  try {
    const emailed = await sendViaEmailJs(data);
    if (emailed) {
      markSubmitted(emailKey, ip, now);
      return { ok: true };
    }
  } catch {
    /* EmailJS fallback failed */
  }

  if (resend.skipped) {
    return {
      ok: false,
      error:
        "Contact delivery is not configured yet. Please email me directly at riyadsarkar1243@gmail.com.",
    };
  }

  return {
    ok: false,
    error: "Something went wrong. Please try again or email me directly.",
  };
}
