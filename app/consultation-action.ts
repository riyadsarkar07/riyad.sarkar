"use server";

import { headers } from "next/headers";
import { adminInbox, emailConfigStatus, publicErrorFor, renderEmail, sendEmail } from "@/lib/email";
import { isEmailJsConfigured, sendViaEmailJs } from "@/lib/emailjs";
import {
  consultationFormSchema,
  type ConsultationActionResult,
} from "@/lib/consultation-schema";
import { isDuplicateSubmission, isRateLimited, markSubmission, markSubmitted } from "@/lib/rate-limit";
import { createActionClient } from "@/lib/supabase/action";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logPersistFailure, persistFailureMessage, unconfiguredStorageMessage } from "@/lib/supabase/errors";
import { isTimeoutError, withTimeout, type RpcResult } from "@/lib/timeout";
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

function weekdayIso(date: string): boolean {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export async function submitConsultationAction(
  input: unknown,
): Promise<ConsultationActionResult> {
  const parsed = consultationFormSchema.safeParse(input);
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
  if (!weekdayIso(data.date)) {
    return { ok: false, error: "Please choose an available weekday.", fieldErrors: { date: "Weekend unavailable" } };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${data.date}T00:00:00`) < today) {
    return { ok: false, error: "Please choose a future date.", fieldErrors: { date: "Please choose a future date." } };
  }

  const ip = await clientIp();
  const emailKey = data.email.toLowerCase();
  const retryingSameBooking = isDuplicateSubmission(data.submissionId, now);
  if (!retryingSameBooking && isRateLimited(emailKey, ip, now)) {
    return { ok: false, error: "Please wait a moment before sending another request." };
  }

  if (!isSupabaseConfigured()) {
    console.error("[consultation] supabase public env is missing");
    return { ok: false, error: unconfiguredStorageMessage("booking") };
  }

  const supabase = await createActionClient();
  if (!supabase) {
    console.error("[consultation] supabase client could not be created");
    return { ok: false, error: unconfiguredStorageMessage("booking") };
  }

  let inserted: unknown = null;
  try {
    const result = await withTimeout<RpcResult<{ id?: string; reference_id?: string; status?: string; duplicate?: boolean } | null>>(
      supabase.rpc("submit_consultation_booking", {
        p_submission_id: data.submissionId,
        p_full_name: data.name,
        p_email: data.email,
        p_phone: data.phone,
        p_service: data.service,
        p_date: data.date,
        p_time: data.time,
        p_timezone: "Asia/Dhaka",
        p_description: data.message,
      }),
      12_000,
      "consultation persist",
    );
    if (result.error) {
      logPersistFailure("consultation", result.error);
      return { ok: false, error: persistFailureMessage("booking", result.error) };
    }
    inserted = result.data;
  } catch (error) {
    if (isTimeoutError(error)) {
      console.error("[consultation] persist timed out");
      return { ok: false, error: persistFailureMessage("booking", { code: "57014", message: "timeout" }) };
    }
    console.error("[consultation] persist threw", error instanceof Error ? error.name : "unknown");
    return { ok: false, error: persistFailureMessage("booking") };
  }

  const row = inserted as { id?: string; reference_id?: string; status?: string; duplicate?: boolean } | null;
  const referenceId = row?.reference_id;
  if (!referenceId) {
    logPersistFailure("consultation", { message: "missing reference" });
    return { ok: false, error: persistFailureMessage("booking") };
  }
  const alreadySaved = row?.duplicate === true;
  markSubmitted(emailKey, ip, now);
  markSubmission(data.submissionId, now);

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone);
  const safeService = escapeHtml(data.service);
  const safeDate = escapeHtml(data.date);
  const safeTime = escapeHtml(data.time);
  const safeMessage = escapeMultiline(data.message);
  const safeRef = escapeHtml(referenceId);

  const adminHtml = renderEmail({
    greeting: "New consultation booking",
    lines: [
      `<strong>${safeRef}</strong> · ${safeName} (${safeEmail})`,
      `Phone / WhatsApp: ${safePhone}`,
      `Service: ${safeService}`,
      `Appointment date: <strong>${safeDate}</strong>`,
      `Appointment time: <strong>${safeTime}</strong>`,
      `Case description:<br/>${safeMessage}`,
    ],
    cta: { label: "Open Appointments", href: `${SITE_URL}/admin/appointments` },
  });

  const adminText = [
    `New consultation booking ${referenceId}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone / WhatsApp: ${data.phone}`,
    `Service: ${data.service}`,
    `Appointment date: ${data.date}`,
    `Appointment time: ${data.time}`,
    "",
    data.message,
  ].join("\n");

  const inbox = adminInbox();
  const config = emailConfigStatus();
  console.error("[consultation-email] sending admin notification", {
    referenceSaved: true,
    duplicate: alreadySaved,
    toHost: inbox.split("@")[1] ?? "invalid",
    env: config,
    emailjs: isEmailJsConfigured(),
  });

  let adminMail;
  try {
    adminMail = await sendEmail({
      to: inbox,
      subject: `New consultation booking ${referenceId} — ${data.service}`,
      html: adminHtml,
      text: adminText,
      replyTo: data.email,
    });
  } catch (error) {
    console.error("[consultation-email] resend threw", error instanceof Error ? error.name : "unknown");
    adminMail = { ok: false, skipped: false as boolean, code: "network" as const, status: undefined as number | undefined };
  }

  let emailDelivered = adminMail.ok && !adminMail.skipped;
  let deliveryVia: "resend" | "emailjs" | "none" = emailDelivered ? "resend" : "none";
  let fallbackReason: "missing_config" | "rejected" | "timeout" | "network" | undefined;

  if (emailDelivered) {
    console.error("[consultation-email] resend accepted", {
      status: adminMail.status,
      duplicate: alreadySaved,
      via: deliveryVia,
    });
  } else {
    let fallback: { ok: boolean; reason?: "missing_config" | "rejected" | "timeout" | "network"; status?: number };
    try {
      fallback = await sendViaEmailJs({
        from_name: data.name,
        from_email: data.email,
        phone: data.phone || "",
        service: data.service,
        project_type: data.service,
        budget: "Not specified",
        timeline: "Not specified",
        date: data.date,
        time: data.time,
        message: [
          `Consultation booking ${referenceId}`,
          `Name: ${data.name}`,
          `Email: ${data.email}`,
          `Phone / WhatsApp: ${data.phone}`,
          `Service: ${data.service}`,
          `Appointment date: ${data.date}`,
          `Appointment time: ${data.time}`,
          "",
          data.message,
        ].join("\n"),
        to_name: "Riyad Sarkar",
        reply_to: data.email,
        reference_id: referenceId,
      });
    } catch (error) {
      console.error("[consultation-email] EmailJS threw", error instanceof Error ? error.name : "unknown");
      fallback = { ok: false, reason: "network" };
    }
    fallbackReason = fallback.reason;
    if (fallback.ok) {
      emailDelivered = true;
      deliveryVia = "emailjs";
      console.error("[consultation-email] resend failed; delivered via EmailJS fallback", {
        code: adminMail.code,
        status: adminMail.status,
        skipped: adminMail.skipped,
        duplicate: alreadySaved,
        via: deliveryVia,
      });
    } else {
      console.error("[consultation-email] EmailJS fallback failed", {
        reason: fallback.reason,
        status: fallback.status,
        duplicate: alreadySaved,
      });
    }
  }

  if (!emailDelivered) {
    console.error("[consultation-email] admin notification not delivered", {
      code: adminMail.code,
      status: adminMail.status,
      skipped: adminMail.skipped,
      fallback: fallbackReason,
      duplicate: alreadySaved,
      via: "none",
      env: config,
    });
  }

  const warningCode =
    emailDelivered
      ? undefined
      : fallbackReason === "timeout" || fallbackReason === "network" || adminMail.code === "network"
        ? "network"
        : adminMail.skipped && fallbackReason === "missing_config"
          ? "missing_key"
          : adminMail.skipped
            ? "provider"
            : adminMail.code;

  return {
    ok: true,
    referenceId,
    emailDelivered,
    emailWarning: emailDelivered ? undefined : publicErrorFor(warningCode),
  };
}
