"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/action";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_TICKET_STATUSES, PUBLIC_BOOKING_STATUSES } from "@/lib/constants";
import { adminInbox, renderEmail, sendEmail } from "@/lib/email";
import { escapeHtml, escapeMultiline } from "@/lib/html";
import { logPersistFailure } from "@/lib/supabase/errors";
import { isTimeoutError, withTimeout, type RpcResult } from "@/lib/timeout";

type ActionResult = { ok: boolean; error?: string };

const lookupSchema = z.object({
  email: z.string().trim().email().max(120),
  referenceId: z.string().trim().min(6).max(40),
});

const replySchema = lookupSchema.extend({
  message: z.string().trim().min(2).max(4000),
});

export type TrackedTicket = {
  id: string;
  reference_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  issue_type: string;
  message: string;
  budget: string | null;
  timeline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  replies: { id: string; sender_role: "user" | "admin"; message: string; created_at: string }[];
};

export async function lookupEmailTicketAction(input: {
  email: string;
  referenceId: string;
}): Promise<{ ok: true; ticket: TrackedTicket } | { ok: false; error: string }> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email and enquiry number." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Tracking is not available right now." };

  const supabase = await createActionClient();
  if (!supabase) return { ok: false, error: "Tracking is not available right now." };

  try {
    const { data, error } = await withTimeout<RpcResult<TrackedTicket | null>>(
      supabase.rpc("lookup_email_ticket", {
        p_email: parsed.data.email,
        p_reference: parsed.data.referenceId,
      }),
      12_000,
      "ticket lookup",
    );
    if (error) {
      logPersistFailure("ticket-lookup", error);
      return { ok: false, error: "Unable to look up this enquiry right now." };
    }
    if (!data) return { ok: false, error: "No enquiry matched that email and reference number." };
    return { ok: true, ticket: data as TrackedTicket };
  } catch (error) {
    if (isTimeoutError(error)) return { ok: false, error: "The lookup timed out. Please try again." };
    return { ok: false, error: "Unable to look up this enquiry right now." };
  }
}

export async function replyEmailTicketAction(input: {
  email: string;
  referenceId: string;
  message: string;
}): Promise<{ ok: true; reply: TrackedTicket["replies"][number] } | { ok: false; error: string }> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please enter a short reply." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Replies are not available right now." };

  const supabase = await createActionClient();
  if (!supabase) return { ok: false, error: "Replies are not available right now." };

  let data: unknown = null;
  try {
    const result = await withTimeout<RpcResult<TrackedTicket["replies"][number] | null>>(
      supabase.rpc("reply_email_ticket", {
        p_email: parsed.data.email,
        p_reference: parsed.data.referenceId,
        p_message: parsed.data.message,
      }),
      12_000,
      "ticket reply",
    );
    if (result.error) {
      if (result.error.message?.includes("resolved")) {
        return { ok: false, error: "This ticket is resolved and cannot accept new replies." };
      }
      logPersistFailure("ticket-reply", result.error);
      return { ok: false, error: "Unable to send that reply right now." };
    }
    data = result.data;
  } catch (error) {
    if (isTimeoutError(error)) return { ok: false, error: "The reply timed out. Please try again." };
    return { ok: false, error: "Unable to send that reply right now." };
  }
  if (!data) return { ok: false, error: "No ticket matched that email and reference number." };

  await sendEmail({
    to: adminInbox(),
    subject: `User reply on [${parsed.data.referenceId}]`,
    html: renderEmail({
      greeting: "New enquiry reply",
      lines: [
        `<strong>${escapeHtml(parsed.data.referenceId)}</strong> · ${escapeHtml(parsed.data.email)}`,
        escapeMultiline(parsed.data.message),
      ],
    }),
    text: `Reply on ${parsed.data.referenceId} from ${parsed.data.email}\n\n${parsed.data.message}`,
    replyTo: parsed.data.email,
  });

  return { ok: true, reply: data as TrackedTicket["replies"][number] };
}

async function requireAdmin() {
  if (!isSupabaseConfigured()) return { supabase: null as null, error: "Not authorized" };
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  if (!data) return { supabase: null as null, error: "Not authorized" };
  return { supabase, error: null as null };
}

export async function adminUpdateEmailTicketAction(input: {
  id: string;
  status?: string;
}): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  if (input.status && !(EMAIL_TICKET_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: "Invalid status" };
  }

  const { data: ticket } = await supabase
    .from("email_tickets")
    .select("id, email, full_name, reference_id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Ticket not found" };

  const { error: updateError } = await supabase
    .from("email_tickets")
    .update({ status: input.status })
    .eq("id", input.id);
  if (updateError) return { ok: false, error: updateError.message };

  if (input.status && input.status !== ticket.status && ticket.email) {
    await sendEmail({
      to: ticket.email,
      subject: `Ticket ${ticket.reference_id} is now ${input.status.replace("_", " ")}`,
      html: renderEmail({
        greeting: `Hi ${escapeHtml(ticket.full_name ?? "there")},`,
        lines: [`Your ticket <strong>${escapeHtml(ticket.reference_id ?? "")}</strong> is now <strong>${escapeHtml(input.status.replace("_", " "))}</strong>.`],
      }),
    });
  }

  revalidatePath("/admin/tickets");
  return { ok: true };
}

export async function adminReplyEmailTicketAction(input: {
  id: string;
  message: string;
}): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  const message = input.message.trim();
  if (message.length < 2 || message.length > 4000) return { ok: false, error: "Enter a reply." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ticket } = await supabase
    .from("email_tickets")
    .select("id, email, full_name, reference_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Ticket not found" };

  const { error: insertError } = await supabase.from("email_ticket_replies").insert({
    ticket_id: ticket.id,
    sender_role: "admin",
    sender_id: user?.id ?? null,
    message,
  });
  if (insertError) return { ok: false, error: insertError.message };

  await supabase.from("email_tickets").update({ status: "awaiting_reply" }).eq("id", ticket.id);

  if (ticket.email) {
    await sendEmail({
      to: ticket.email,
      subject: `Reply on ${ticket.reference_id}`,
      html: renderEmail({
        greeting: `Hi ${escapeHtml(ticket.full_name ?? "there")},`,
        lines: [
          `There is a new reply on ticket <strong>${escapeHtml(ticket.reference_id ?? "")}</strong>.`,
          escapeMultiline(message),
        ],
      }),
      text: `Reply on ${ticket.reference_id}\n\n${message}`,
    });
  }

  revalidatePath("/admin/tickets");
  return { ok: true };
}

export async function adminUpdatePublicBookingAction(input: {
  id: string;
  status?: string;
}): Promise<ActionResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  if (input.status && !(PUBLIC_BOOKING_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: "Invalid status" };
  }

  const { data: booking } = await supabase
    .from("consultation_bookings")
    .select("id, email, full_name, reference_id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Appointment not found" };

  const { error: updateError } = await supabase
    .from("consultation_bookings")
    .update({ status: input.status })
    .eq("id", input.id);
  if (updateError) return { ok: false, error: updateError.message };

  if (input.status && input.status !== booking.status && booking.email) {
    await sendEmail({
      to: booking.email,
      subject: `Appointment ${booking.reference_id} is now ${input.status}`,
      html: renderEmail({
        greeting: `Hi ${escapeHtml(booking.full_name ?? "there")},`,
        lines: [`Your appointment <strong>${escapeHtml(booking.reference_id ?? "")}</strong> is now <strong>${escapeHtml(input.status)}</strong>.`],
      }),
    });
  }

  revalidatePath("/admin/appointments");
  return { ok: true };
}
