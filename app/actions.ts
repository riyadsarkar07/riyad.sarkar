"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  notifyAppointmentCreated,
  notifyAppointmentStatus,
  notifyChatJoined,
  notifyChatMessage,
  notifyChatStarted,
  notifySupportReply,
  notifyTicketCreated,
} from "@/lib/notifications";
import {
  ALLOWED_FILE_TYPES,
  APPOINTMENT_SERVICES,
  MAX_FILE_SIZE,
  TICKET_CATEGORIES,
} from "@/lib/constants";
import type { ChatMessage, ChatSession } from "@/types/dashboard";

type ActionResult = { ok: boolean; error?: string; referenceId?: string };

type ChatJoinResult = {
  ok?: boolean;
  joined?: boolean;
  welcome?: boolean;
  status?: string;
  admin_name?: string | null;
  reference_id?: string | null;
  user_id?: string | null;
};

async function runJoinChatSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<{ ok: true; result: ChatJoinResult } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("join_chat_session", {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, error: error.message };
  const result = (data ?? {}) as ChatJoinResult;
  if (result.joined && result.user_id && result.admin_name && result.reference_id) {
    await notifyChatJoined({
      userId: result.user_id,
      adminName: result.admin_name,
      referenceId: result.reference_id,
    });
  }
  return { ok: true, result };
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

async function requireUser() {
  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null, error: "Not signed in" as string };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Not signed in" as string };
  return { supabase, user, error: null };
}

function validateFileMeta(meta: {
  storagePath: string;
  fileName: string;
  mimeType: string;
  size: number;
}): string | null {
  if (!ALLOWED_FILE_TYPES.includes(meta.mimeType)) return "Invalid file type.";
  if (meta.size > MAX_FILE_SIZE) return "File too large (max 5 MB).";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Appointments                                                       */
/* ------------------------------------------------------------------ */

const appointmentSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  service: z.enum(APPOINTMENT_SERVICES),
  date: z.string().min(8),
  time: z.string().min(1),
  timezone: z.string().default("Asia/Dhaka (GMT+6)"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  problemDescription: z.string().min(10),
  additionalDetails: z.string().optional(),
  preferredContact: z.enum(["email", "whatsapp", "phone"]),
});

export async function createAppointmentAction(input: {
  form: z.infer<typeof appointmentSchema>;
  files?: { storagePath: string; fileName: string; mimeType: string; size: number }[];
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const parsed = appointmentSchema.safeParse(input.form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid appointment data" };
  }

  const fileMetas = (input.files ?? []).map((f) => ({
    ...f,
    fileError: validateFileMeta(f),
  }));
  for (const f of fileMetas) {
    if (f.fileError) return { ok: false, error: f.fileError };
    if (!f.storagePath.startsWith(`${user.id}/`)) {
      return { ok: false, error: "Invalid file path" };
    }
  }

  const d = parsed.data;

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      full_name: d.fullName,
      email: d.email,
      phone: d.phone,
      service: d.service,
      appointment_date: d.date,
      appointment_time: d.time,
      timezone: d.timezone,
      priority: d.priority,
      problem_description: d.problemDescription,
      additional_details: d.additionalDetails ?? null,
      preferred_contact: d.preferredContact,
    })
    .select("*")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: "You already have an appointment for this date and time." };
    }
    return { ok: false, error: insertError.message };
  }
  if (!appointment) return { ok: false, error: "Could not create appointment." };
  if (!appointment.reference_id) return { ok: false, error: "Appointment saved without a reference. Please contact support." };

  for (const f of fileMetas) {
    await supabase.from("appointment_files").insert({
      appointment_id: appointment.id,
      user_id: user.id,
      storage_path: f.storagePath,
      file_name: f.fileName,
      mime_type: f.mimeType,
      size: f.size,
    });
  }

  revalidatePath("/dashboard");

  await notifyAppointmentCreated({
    userId: user.id,
    userEmail: d.email,
    userName: d.fullName,
    referenceId: appointment.reference_id,
    service: d.service,
    date: d.date,
    time: d.time,
  });

  return { ok: true, referenceId: appointment.reference_id };
}

export async function requestRescheduleAction(id: string, date: string, time: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ appointment_date: date, appointment_time: time, status: "reschedule_requested" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function requestCancellationAction(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Support tickets                                                    */
/* ------------------------------------------------------------------ */

const ticketSchema = z.object({
  subject: z.string().min(3),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  message: z.string().min(10),
  appointmentId: z.string().uuid().optional().nullable(),
});

export async function createTicketAction(input: {
  form: z.infer<typeof ticketSchema>;
  files?: { storagePath: string; fileName: string; mimeType: string; size: number }[];
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const parsed = ticketSchema.safeParse(input.form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ticket data" };
  }

  const fileMetas = (input.files ?? []).map((f) => ({
    ...f,
    fileError: validateFileMeta(f),
  }));
  for (const f of fileMetas) {
    if (f.fileError) return { ok: false, error: f.fileError };
    if (!f.storagePath.startsWith(`${user.id}/`)) return { ok: false, error: "Invalid file path" };
  }

  const d = parsed.data;
  if (d.appointmentId) {
    const { data: owns } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", d.appointmentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!owns) return { ok: false, error: "Invalid appointment reference" };
  }

  const { data: ticket, error: insertError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      appointment_id: d.appointmentId ?? null,
      subject: d.subject,
      category: d.category,
      priority: d.priority,
      message: d.message,
    })
    .select("*")
    .maybeSingle();

  if (insertError) return { ok: false, error: insertError.message };
  if (!ticket) return { ok: false, error: "Could not create ticket." };
  if (!ticket.reference_id) {
    return { ok: false, error: "Ticket saved without a case ID. Please contact support." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  for (const f of fileMetas) {
    const { data: fileRow } = await supabase
      .from("support_files")
      .insert({
        ticket_id: ticket.id,
        user_id: user.id,
        storage_path: f.storagePath,
        file_name: f.fileName,
        mime_type: f.mimeType,
        size: f.size,
      })
      .select("id")
      .maybeSingle();

    if (fileRow) {
      await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          sender_role: "user",
          message: d.message,
          attachment_file_id: fileRow.id,
        });
    }
  }
  if (fileMetas.length === 0) {
    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_role: "user",
      message: d.message,
    });
  }

  revalidatePath("/dashboard");

  await notifyTicketCreated({
    userId: user.id,
    userEmail: profile?.email ?? d.subject,
    userName: profile?.full_name ?? "Client",
    referenceId: ticket.reference_id,
    subject: d.subject,
  });

  return { ok: true, referenceId: ticket.reference_id };
}

export async function sendMessageAction(input: {
  ticketId: string;
  message: string;
  file?: { storagePath: string; fileName: string; mimeType: string; size: number };
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const text = input.message.trim();
  if (text.length < 1) return { ok: false, error: "Message cannot be empty." };
  if (text.length > 4000) return { ok: false, error: "Message is too long." };

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", input.ticketId)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Ticket not found" };

  const isAdmin = await isAdminUser();
  if (!isAdmin && ticket.user_id !== user.id) return { ok: false, error: "Not authorized" };
  if (ticket.status === "closed") return { ok: false, error: "This case is closed." };
  const role: "user" | "admin" = isAdmin ? "admin" : "user";

  let fileId: string | null = null;
  if (input.file) {
    const fErr = validateFileMeta(input.file);
    if (fErr) return { ok: false, error: fErr };
    const { data: fileRow } = await supabase
      .from("support_files")
      .insert({
        ticket_id: ticket.id,
        user_id: isAdmin ? null : user.id,
        storage_path: input.file.storagePath,
        file_name: input.file.fileName,
        mime_type: input.file.mimeType,
        size: input.file.size,
      })
      .select("id")
      .maybeSingle();
    fileId = fileRow?.id ?? null;
  }

  const { error: msgError } = await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: role,
    message: text,
    attachment_file_id: fileId,
  });

  if (msgError) return { ok: false, error: msgError.message };

  if (role === "user" && ticket.status === "open") {
    await supabase.from("support_tickets").update({ status: "pending" }).eq("id", ticket.id);
  } else {
    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticket.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", ticket.user_id)
    .maybeSingle();

  await notifySupportReply({
    userId: role === "admin" ? ticket.user_id : null,
    userEmail: profile?.email ?? "",
    userName: profile?.full_name ?? "Client",
    referenceId: ticket.reference_id ?? "",
    senderRole: role,
    preview: text,
  });

  return { ok: true, referenceId: ticket.reference_id ?? undefined };
}

export async function closeTicketAction(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return { ok: false, error: "Ticket not found" };
  const isAdmin = await isAdminUser();
  if (!isAdmin && ticket.user_id !== user.id) return { ok: false, error: "Not authorized" };
  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({ status: "closed" })
    .eq("id", id);
  if (updateError) return { ok: false, error: updateError.message };
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Admin                                                              */
/* ------------------------------------------------------------------ */

async function isAdminUser() {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return !!data;
}

export async function adminUpdateAppointmentAction(input: {
  id: string;
  status?: string;
  priority?: string;
  adminNotes?: string;
  date?: string;
  time?: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not authorized" };
  const supabase = await createClient();
  if (!(await isAdminUser())) return { ok: false, error: "Not authorized" };

  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.priority) patch.priority = input.priority;
  if (input.adminNotes !== undefined) patch.admin_notes = input.adminNotes;
  if (input.date) patch.appointment_date = input.date;
  if (input.time) patch.appointment_time = input.time;

  const { data: appointment } = await supabase
    .from("appointments")
    .select("user_id, email, full_name, reference_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "Appointment not found" };

  const { error } = await supabase.from("appointments").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  if (input.status && appointment.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", appointment.user_id)
      .maybeSingle();
    await notifyAppointmentStatus({
      userId: appointment.user_id,
      userEmail: profile?.email ?? appointment.email,
      userName: profile?.full_name ?? appointment.full_name,
      referenceId: appointment.reference_id ?? "",
      status: input.status,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminUpdateTicketAction(input: {
  id: string;
  status?: string;
  priority?: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not authorized" };
  const supabase = await createClient();
  if (!(await isAdminUser())) return { ok: false, error: "Not authorized" };

  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.priority) patch.priority = input.priority;

  const { error } = await supabase.from("support_tickets").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Live chat                                                          */
/* ------------------------------------------------------------------ */

export async function loadLiveChatInboxAction(): Promise<{
  ok: boolean;
  error?: string;
  sessions?: ChatSession[];
  profiles?: Record<string, string>;
  unread?: Record<string, number>;
  agentOnline?: boolean | null;
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const isAdmin = await isAdminUser();
  let q = supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false });
  if (!isAdmin) q = q.eq("user_id", user.id);
  const { data, error: qErr } = await q;
  if (qErr) return { ok: false, error: qErr.message };

  const sessions = (data ?? []) as ChatSession[];
  const profiles: Record<string, string> = {};
  if (isAdmin && sessions.length > 0) {
    const ids = Array.from(new Set(sessions.map((s) => s.user_id)));
    const { data: rows } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
    for (const row of rows ?? []) {
      const p = row as { id: string; full_name: string | null; email: string | null };
      profiles[p.id] = p.full_name || p.email || "Client";
    }
  }

  let unreadQ = supabase.from("chat_messages").select("session_id").eq("read", false);
  unreadQ = unreadQ.eq("sender_role", isAdmin ? "user" : "admin");
  const { data: msgRows } = await unreadQ;
  const unread: Record<string, number> = {};
  for (const r of (msgRows ?? []) as { session_id: string }[]) {
    unread[r.session_id] = (unread[r.session_id] ?? 0) + 1;
  }

  const { data: onlineCount, error: onlineErr } = await supabase.rpc("admin_online_count");
  const agentOnline = onlineErr
    ? null
    : typeof onlineCount === "number"
      ? onlineCount > 0
      : Number(onlineCount) > 0;

  return { ok: true, sessions, profiles, unread, agentOnline };
}

export async function loadLiveChatMessagesAction(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
  messages?: ChatMessage[];
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data: session } = await supabase.from("chat_sessions").select("id, user_id").eq("id", sessionId).maybeSingle();
  if (!session) return { ok: false, error: "Chat session not found." };
  const isAdmin = await isAdminUser();
  if (!isAdmin && session.user_id !== user.id) return { ok: false, error: "Not authorized" };

  const { data, error: qErr } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (qErr) return { ok: false, error: qErr.message };
  return { ok: true, messages: (data ?? []) as ChatMessage[] };
}

export async function markChatReadAction(sessionId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const isAdmin = await isAdminUser();
  const incomingRole = isAdmin ? "user" : "admin";
  const { error: updErr } = await supabase
    .from("chat_messages")
    .update({ read: true })
    .eq("session_id", sessionId)
    .eq("sender_role", incomingRole)
    .eq("read", false);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

export async function startChatSessionAction(): Promise<ActionResult & { sessionId?: string }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["waiting", "active"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (existing) {
    if (!existing.reference_id) return { ok: false, error: "Chat session is missing a session ID." };
    return { ok: true, referenceId: existing.reference_id, sessionId: existing.id };
  }

  const { data: session, error: insertError } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, status: "waiting" })
    .select("*")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["waiting", "active"])
        .maybeSingle();
      if (raced?.id) {
        return { ok: true, referenceId: raced.reference_id ?? undefined, sessionId: raced.id };
      }
    }
    console.error("[live-chat] start session insert failed", {
      code: insertError.code ?? "unknown",
      hint: insertError.hint ?? null,
      message: insertError.message ? "present" : "none",
    });
    const msg = (insertError.message ?? "").toLowerCase();
    if (
      insertError.code === "42883" ||
      insertError.code === "42501" ||
      msg.includes("gen_random_bytes") ||
      msg.includes("function") ||
      msg.includes("permission") ||
      msg.includes("does not exist")
    ) {
      return {
        ok: false,
        error: "Live chat case IDs could not be created on the server. Apply the latest database migration, then retry.",
      };
    }
    return { ok: false, error: insertError.message || "Could not start a live chat session. Please retry." };
  }
  if (!session) return { ok: false, error: "Could not start a live chat session. Please retry." };
  if (!session.reference_id) return { ok: false, error: "Chat saved without a case ID. Please retry." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  await notifyChatStarted({
    userId: user.id,
    userEmail: profile?.email ?? user.email ?? "",
    userName: profile?.full_name ?? "Client",
    referenceId: session.reference_id,
  });

  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return { ok: true, referenceId: session.reference_id, sessionId: session.id };
}

export async function joinChatSessionAction(sessionId: string): Promise<
  ActionResult & {
    joined?: boolean;
    welcome?: boolean;
    adminName?: string | null;
    status?: string;
  }
> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  if (!(await isAdminUser())) return { ok: false, error: "Not authorized" };

  const joined = await runJoinChatSession(supabase, sessionId);
  if (!joined.ok) return { ok: false, error: joined.error };

  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return {
    ok: true,
    joined: !!joined.result.joined,
    welcome: !!joined.result.welcome,
    adminName: joined.result.admin_name ?? null,
    status: joined.result.status,
    referenceId: joined.result.reference_id ?? undefined,
  };
}

export async function sendChatMessageAction(input: {
  sessionId: string;
  message: string;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const text = input.message.trim();
  if (text.length < 1) return { ok: false, error: "Message cannot be empty." };
  if (text.length > 4000) return { ok: false, error: "Message is too long." };

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Chat session not found." };
  if (session.status === "closed") return { ok: false, error: "This chat session is closed." };

  const isAdmin = await isAdminUser();
  if (!isAdmin && session.user_id !== user.id) return { ok: false, error: "Not authorized" };
  const role: "user" | "admin" = isAdmin ? "admin" : "user";

  if (isAdmin && session.status !== "closed") {
    const joined = await runJoinChatSession(supabase, session.id);
    if (!joined.ok) return { ok: false, error: joined.error };
  }

  const { error: msgError } = await supabase.from("chat_messages").insert({
    session_id: session.id,
    sender_id: user.id,
    sender_role: role,
    message: text,
    kind: "message",
  });
  if (msgError) return { ok: false, error: msgError.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", session.user_id)
    .maybeSingle();

  await notifyChatMessage({
    userId: role === "admin" ? session.user_id : null,
    userEmail: profile?.email ?? "",
    userName: profile?.full_name ?? "Client",
    referenceId: session.reference_id ?? "",
    senderRole: role,
    preview: text,
  });

  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return { ok: true, referenceId: session.reference_id ?? undefined };
}

export async function closeChatSessionAction(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("user_id, reference_id")
    .eq("id", id)
    .maybeSingle();
  if (!session) return { ok: false, error: "Chat session not found." };
  const isAdmin = await isAdminUser();
  if (!isAdmin && session.user_id !== user.id) return { ok: false, error: "Not authorized" };
  const { error: updateError } = await supabase
    .from("chat_sessions")
    .update({ status: "closed" })
    .eq("id", id);
  if (updateError) return { ok: false, error: updateError.message };
  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return { ok: true, referenceId: session.reference_id ?? undefined };
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateSettingsAction(key: string, value: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not authorized" };
  const supabase = await createClient();
  if (!(await isAdminUser())) return { ok: false, error: "Not authorized" };
  const { error } = await supabase.from("settings").upsert({ key, value });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}
