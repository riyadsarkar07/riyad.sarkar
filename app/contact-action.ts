"use server";

import { headers } from "next/headers";
import { adminInbox, publicErrorFor, renderEmail, sendEmail } from "@/lib/email";
import {
  contactFormSchema,
  type ContactActionResult,
  type ContactFormValues,
} from "@/lib/contact-schema";
import { isDuplicateSubmission, isRateLimited, markSubmission, markSubmitted } from "@/lib/rate-limit";
import { createActionClient } from "@/lib/supabase/action";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { escapeHtml, escapeMultiline } from "@/lib/html";

const MIN_SUBMIT_MS = 2500;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof process.env.VERCEL_URL === "string" ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

async function sendViaEmailJs(data: ContactFormValues, referenceId: string): Promise<boolean> {
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
        phone: data.phone || "",
        service: data.projectType,
        project_type: data.projectType,
        budget: data.budget || "Not specified",
        timeline: data.timeline || "Not specified",
        date: new Date().toISOString(),
        time: "",
        message: data.message,
        to_name: "Riyad Sarkar",
        reply_to: data.email,
        reference_id: referenceId,
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
  if (
    (data.submissionId && isDuplicateSubmission(data.submissionId, now)) ||
    isRateLimited(emailKey, ip, now)
  ) {
    return {
      ok: false,
      error: "Please wait a moment before sending another message.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Ticket storage is not configured yet. Please email me directly at riyadsarkar1243@gmail.com.",
    };
  }

  const supabase = await createActionClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Ticket storage is not configured yet. Please email me directly at riyadsarkar1243@gmail.com.",
    };
  }

  const submissionId = data.submissionId ?? crypto.randomUUID();
  const { data: inserted, error: insertError } = await supabase.rpc("submit_email_ticket", {
    p_submission_id: submissionId,
    p_full_name: data.name,
    p_email: data.email,
    p_phone: data.phone ?? "",
    p_issue_type: data.projectType,
    p_message: data.message,
    p_budget: data.budget ?? "",
    p_timeline: data.timeline ?? "",
  });

  if (insertError) {
    console.error("[enquiry] persist failed", insertError.message);
    return { ok: false, error: "The enquiry could not be saved. Please try again or email me directly." };
  }

  const row = inserted as { id?: string; reference_id?: string; status?: string; duplicate?: boolean } | null;
  const referenceId = row?.reference_id;
  if (!referenceId) {
    return { ok: false, error: "The enquiry could not be saved. Please try again or email me directly." };
  }

  markSubmitted(emailKey, ip, now);
  markSubmission(submissionId, now);

  const budget = data.budget && data.budget.length > 0 ? data.budget : "Not specified";
  const timeline = data.timeline && data.timeline.length > 0 ? data.timeline : "Not specified";
  const phone = data.phone && data.phone.length > 0 ? data.phone : "Not specified";
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeType = escapeHtml(data.projectType);
  const safeBudget = escapeHtml(budget);
  const safeTimeline = escapeHtml(timeline);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeMultiline(data.message);
  const safeRef = escapeHtml(referenceId);

  const html = renderEmail({
    greeting: "New support ticket",
    lines: [
      `<strong>${safeRef}</strong> · ${safeName} (${safeEmail})`,
      `Issue type: ${safeType}`,
      `Phone / WhatsApp: ${safePhone}`,
      `Budget: ${safeBudget} · Timeline: ${safeTimeline}`,
      `Message:<br/>${safeMessage}`,
    ],
    cta: { label: "Open Email Support Tickets", href: `${SITE_URL}/admin/tickets` },
  });

  const text = [
    `New Support Ticket ${referenceId} — ${data.projectType}`,
    `From: ${data.name} <${data.email}>`,
    `Phone: ${phone}`,
    `Budget: ${budget}`,
    `Timeline: ${timeline}`,
    "",
    data.message,
  ].join("\n");

  const resend = await sendEmail({
    to: adminInbox(),
    subject: `New Support Ticket [${referenceId}] — ${data.projectType}`,
    html,
    text,
    replyTo: data.email,
  });

  let emailDelivered = resend.ok && !resend.skipped;

  if (!emailDelivered) {
    try {
      emailDelivered = await sendViaEmailJs(data, referenceId);
    } catch {
      emailDelivered = false;
    }
  }

  if (emailDelivered) {
    await sendEmail({
      to: data.email,
      subject: `Support ticket opened — ${referenceId}`,
      html: renderEmail({
        greeting: `Hi ${safeName},`,
        lines: [
          `Your enquiry has been received as ticket <strong>${safeRef}</strong>.`,
          `Issue type: ${safeType}`,
          "You can track status and replies with your email and ticket number.",
        ],
        cta: { label: "Track My Enquiry", href: `${SITE_URL}/track` },
      }),
      text: `Ticket ${referenceId} created. Track it at ${SITE_URL}/track`,
    });
  }

  return {
    ok: true,
    referenceId,
    emailDelivered,
    emailWarning: emailDelivered ? undefined : publicErrorFor(resend.skipped ? "missing_key" : resend.code),
  };
}
