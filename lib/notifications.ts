import "server-only";

import { createClient } from "@/lib/supabase/server";
import { adminInbox, renderEmail, sendEmail } from "@/lib/email";
import { STATUS_LABELS } from "@/lib/constants";
import { escapeHtml } from "@/lib/html";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof process.env.VERCEL_URL === "string"
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

/** Create an in-app notification (RLS-safe via SECURITY DEFINER RPC). */
async function notifyUser(userId: string, title: string, body: string, type = "info") {
  const supabase = await createClient();
  await supabase.rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_body: body,
    p_type: type,
  });
}

export async function notifyAppointmentCreated(input: {
  userId: string;
  userEmail: string;
  userName: string;
  referenceId: string;
  service: string;
  date: string;
  time: string;
}) {
  await notifyUser(
    input.userId,
    "Appointment booked",
    `Your appointment ${input.referenceId} (${input.service}) is pending confirmation.`,
    "appointment",
  );

  await sendEmail({
    to: input.userEmail,
    subject: `Appointment booked — ${input.referenceId}`,
    html: renderEmail({
      greeting: `Hi ${escapeHtml(input.userName)},`,
      lines: [
        `Your appointment has been received.`,
        `Reference: <strong>${escapeHtml(input.referenceId)}</strong>`,
        `Service: ${badge(escapeHtml(input.service))}`,
        `Date: <strong>${escapeHtml(input.date)}</strong> · Time: <strong>${escapeHtml(input.time)}</strong>`,
        "Our team will review your case and confirm shortly.",
      ],
      cta: { label: "View My Appointments", href: `${SITE_URL}/dashboard/appointments` },
    }),
    text: `Appointment ${input.referenceId} received. Date: ${input.date} at ${input.time}.`,
  });

  await sendEmail({
    to: adminInbox(),
    subject: `New appointment — ${input.referenceId}`,
    html: renderEmail({
      greeting: "New appointment request",
      lines: [
        `<strong>${escapeHtml(input.referenceId)}</strong> · ${escapeHtml(input.userName)} (${escapeHtml(input.userEmail)})`,
        `Service: ${badge(escapeHtml(input.service))}`,
        `Date: <strong>${escapeHtml(input.date)}</strong> · Time: <strong>${escapeHtml(input.time)}</strong>`,
      ],
      cta: { label: "Open Admin Appointments", href: `${SITE_URL}/admin/appointments` },
    }),
    text: `New appointment ${input.referenceId} from ${input.userName}.`,
  });
}

export async function notifyAppointmentStatus(input: {
  userId: string;
  userEmail: string;
  userName: string;
  referenceId: string;
  status: string;
}) {
  const label = STATUS_LABELS[input.status] ?? input.status;
  await notifyUser(
    input.userId,
    "Appointment updated",
    `Your appointment ${input.referenceId} is now ${label}.`,
    "appointment",
  );
  await sendEmail({
    to: input.userEmail,
    subject: `Appointment ${label} — ${input.referenceId}`,
    html: renderEmail({
      greeting: `Hi ${escapeHtml(input.userName)},`,
      lines: [
        `Your appointment <strong>${escapeHtml(input.referenceId)}</strong> is now <strong>${escapeHtml(label)}</strong>.`,
      ],
      cta: { label: "View My Appointments", href: `${SITE_URL}/dashboard/appointments` },
    }),
  });
}

export async function notifyTicketCreated(input: {
  userId: string;
  userEmail: string;
  userName: string;
  referenceId: string;
  subject: string;
}) {
  await notifyUser(
    input.userId,
    "Support ticket created",
    `Your ticket ${input.referenceId} — "${input.subject}" has been opened.`,
    "support",
  );
  await sendEmail({
    to: input.userEmail,
    subject: `Support ticket opened — ${input.referenceId}`,
    html: renderEmail({
      greeting: `Hi ${escapeHtml(input.userName)},`,
      lines: [
        `Your support ticket <strong>${escapeHtml(input.referenceId)}</strong> has been created.`,
        `Subject: ${badge(escapeHtml(input.subject))}`,
        "We will get back to you shortly.",
      ],
      cta: { label: "Open Support", href: `${SITE_URL}/dashboard/support` },
    }),
  });
  await sendEmail({
    to: adminInbox(),
    subject: `New support ticket — ${input.referenceId}`,
    html: renderEmail({
      greeting: "New support ticket",
      lines: [
        `<strong>${escapeHtml(input.referenceId)}</strong> — ${escapeHtml(input.subject)}`,
        `From: ${escapeHtml(input.userName)} (${escapeHtml(input.userEmail)})`,
      ],
      cta: { label: "Open Admin Support", href: `${SITE_URL}/admin/support` },
    }),
    text: `New support ticket ${input.referenceId} — ${input.subject}`,
  });
}

export async function notifySupportReply(input: {
  userId: string | null;
  userEmail: string;
  userName: string;
  referenceId: string;
  senderRole: "user" | "admin";
  preview: string;
}) {
  const snippet = input.preview.slice(0, 140);
  if (input.senderRole === "admin" && input.userId) {
    await notifyUser(
      input.userId,
      "New reply",
      `Support replied on ${input.referenceId}: "${snippet}"`,
      "support",
    );
    await sendEmail({
      to: input.userEmail,
      subject: `Reply on ${input.referenceId}`,
      html: renderEmail({
      greeting: `Hi ${escapeHtml(input.userName)},`,
      lines: [
        `You have a new reply on ticket <strong>${escapeHtml(input.referenceId)}</strong>.`,
        p(escapeHtml(snippet)),
      ],
        cta: { label: "Open Support", href: `${SITE_URL}/dashboard/support` },
      }),
    });
  } else {
    await sendEmail({
      to: adminInbox(),
      subject: `New reply on ${input.referenceId}`,
      html: renderEmail({
        greeting: "New user reply",
        lines: [
          `<strong>${escapeHtml(input.referenceId)}</strong> — ${escapeHtml(input.userName)}`,
          p(escapeHtml(snippet)),
        ],
        cta: { label: "Open Admin Support", href: `${SITE_URL}/admin/support` },
      }),
      text: `New user reply on ${input.referenceId}`,
    });
  }
}

export async function notifyChatStarted(input: {
  userId: string;
  userEmail: string;
  userName: string;
  referenceId: string;
}) {
  await notifyUser(
    input.userId,
    "Live chat started",
    `Your live chat session ${input.referenceId} is waiting for an agent.`,
    "chat",
  );
  await sendEmail({
    to: adminInbox(),
    subject: `New live chat — ${input.referenceId}`,
    html: renderEmail({
      greeting: "New live chat session",
      lines: [
        `<strong>${escapeHtml(input.referenceId)}</strong> — ${escapeHtml(input.userName)} (${escapeHtml(input.userEmail)})`,
      ],
      cta: { label: "Open Live Chat", href: `${SITE_URL}/admin/chat` },
    }),
    text: `New live chat ${input.referenceId} from ${input.userName}.`,
  });
}

export async function notifyChatJoined(input: {
  userId: string;
  adminName: string;
  referenceId: string;
}) {
  await notifyUser(
    input.userId,
    "Agent joined your live chat",
    `${input.adminName} has joined your live chat. Reference ID: ${input.referenceId}.`,
    "chat",
  );
}

export async function notifyChatMessage(input: {
  userId: string | null;
  userEmail: string;
  userName: string;
  referenceId: string;
  senderRole: "user" | "admin";
  preview: string;
}) {
  const snippet = input.preview.slice(0, 140);
  if (input.senderRole === "admin" && input.userId) {
    await notifyUser(
      input.userId,
      "Live chat reply",
      `Support replied in ${input.referenceId}: "${snippet}"`,
      "chat",
    );
  } else {
    await sendEmail({
      to: adminInbox(),
      subject: `Live chat message — ${input.referenceId}`,
      html: renderEmail({
        greeting: "New live chat message",
        lines: [
          `<strong>${escapeHtml(input.referenceId)}</strong> — ${escapeHtml(input.userName)}`,
          p(escapeHtml(snippet)),
        ],
        cta: { label: "Open Live Chat", href: `${SITE_URL}/admin/chat` },
      }),
      text: `New live chat message on ${input.referenceId}`,
    });
  }
}

const p = (text: string) => `<p style="margin:8px 0;padding:10px 12px;background:#0b1220;border-radius:8px">${text}</p>`;
const badge = (text: string) =>
  `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#1e293b;font-size:12px">${text}</span>`;
