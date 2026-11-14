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
  APPOINTMENT_STATUSES,
  MAX_FILE_SIZE,
  CHAT_PRIORITIES,
  PRIORITIES,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TIME_SLOTS,
} from "@/lib/constants";
import type {
  ChatAgentEvent,
  ChatAssignment,
  ChatCaseEvent,
  ChatCustomer,
  ChatDepartment,
  ChatEscalation,
  ChatMessage,
  ChatSession,
  ChatStaffMember,
  ChatTeam,
} from "@/types/dashboard";

type ActionResult = { ok: boolean; error?: string; referenceId?: string; status?: string };

type ChatJoinResult = {
  ok?: boolean;
  joined?: boolean;
  welcome?: boolean;
  status?: string;
  admin_name?: string | null;
  assigned_admin_id?: string | null;
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
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
    .refine((value) => value >= new Date().toISOString().slice(0, 10), "Choose a future date."),
  time: z.string().refine((value) => (TIME_SLOTS as readonly string[]).includes(value), "Choose a valid time."),
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

  return { ok: true, referenceId: appointment.reference_id, status: appointment.status ?? "pending" };
}

export async function requestRescheduleAction(id: string, date: string, time: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Choose a valid date." };
  if (!(TIME_SLOTS as readonly string[]).includes(time)) return { ok: false, error: "Choose a valid time." };
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) return { ok: false, error: "Choose a future date." };

  const { data: appointment } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "Appointment not found." };
  if (appointment.status === "cancelled" || appointment.status === "completed") {
    return { ok: false, error: "This appointment can no longer be rescheduled." };
  }

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

  const { data: appointment } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "Appointment not found." };
  if (appointment.status === "cancelled") return { ok: true };
  if (appointment.status === "completed") {
    return { ok: false, error: "Completed appointments cannot be cancelled." };
  }

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

  let firstFileId: string | null = null;
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

    if (fileRow?.id && !firstFileId) firstFileId = fileRow.id;
  }

  await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: "user",
    message: d.message,
    attachment_file_id: firstFileId,
  });

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

  if (input.status && !(APPOINTMENT_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: "Invalid status" };
  }
  if (input.priority && !(PRIORITIES as readonly string[]).includes(input.priority)) {
    return { ok: false, error: "Invalid priority" };
  }

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

  if (input.status && !(TICKET_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: "Invalid status" };
  }
  if (input.priority && !(PRIORITIES as readonly string[]).includes(input.priority)) {
    return { ok: false, error: "Invalid priority" };
  }

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

type ChatScope = "user" | "admin";

type ChatInboxFilters = {
  statuses?: string[] | null;
  priorities?: string[];
  assignee?: string | null;
  team?: string | null;
  department?: string | null;
  hasEscalation?: boolean | null;
  query?: string | null;
  cursorUpdatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
};

type ChatInboxCounts = {
  waiting: number;
  active: number;
  pending_client: number;
  resolved: number;
  closed: number;
  all: number;
};

type ChatInboxCursor = { updated_at: string | null; id: string | null; has_more: boolean };

type ChatInboxResult = {
  sessions: ChatSession[];
  counts: ChatInboxCounts;
  next_cursor: ChatInboxCursor;
  server_now: string;
};

type ChatMessagePage = {
  messages: ChatMessage[];
  has_more: boolean;
  server_now: string;
};

type ChatTimelineResult = {
  events: ChatCaseEvent[];
  escalations: ChatEscalation[];
  assignments: ChatAssignment[];
  server_now: string;
};

async function getStaffRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("staff_role");
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function loadLiveChatInboxAction(
  scope: ChatScope = "user",
  filters: ChatInboxFilters = {},
): Promise<{
  ok: boolean;
  error?: string;
  sessions?: ChatSession[];
  profiles?: Record<string, string>;
  customers?: Record<string, ChatCustomer>;
  unread?: Record<string, number>;
  counts?: ChatInboxCounts;
  nextCursor?: ChatInboxCursor;
  serverNow?: string;
  agentOnline?: boolean | null;
  staffRole?: string | null;
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const role = await getStaffRole(supabase);
  const asAdmin = scope === "admin" && role !== null;
  if (scope === "admin" && !asAdmin) return { ok: false, error: "Not authorized" };

  const { data, error: rpcErr } = await supabase.rpc("chat_inbox_page", {
    p_scope: asAdmin ? "admin" : "user",
    p_statuses: filters.statuses ?? null,
    p_priorities: filters.priorities ?? null,
    p_assignee: filters.assignee ?? null,
    p_team: filters.team ?? null,
    p_department: filters.department ?? null,
    p_has_escalation: filters.hasEscalation ?? null,
    p_query: filters.query ?? null,
    p_cursor_updated_at: filters.cursorUpdatedAt ?? null,
    p_cursor_id: filters.cursorId ?? null,
    p_limit: filters.limit ?? 30,
  });

  if (rpcErr) {
    const msg = (rpcErr.message ?? "").toLowerCase();
    if (rpcErr.code === "42883" || msg.includes("chat_inbox_page") || msg.includes("does not exist")) {
      return {
        ok: false,
        error: "Live chat needs the latest database migration. Apply it, then retry.",
      };
    }
    return { ok: false, error: rpcErr.message };
  }

  const page = (data ?? {}) as ChatInboxResult;
  const sessions = (page.sessions ?? []) as ChatSession[];

  const profiles: Record<string, string> = {};
  const customers: Record<string, ChatCustomer> = {};
  if (asAdmin && sessions.length > 0) {
    const ids = Array.from(new Set(sessions.map((s) => s.user_id)));
    const isAdmin = await isAdminUser();
    let rows: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
    }[] = [];
    if (isAdmin) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", ids);
      rows = (data ?? []) as typeof rows;
    } else {
      const { data } = await supabase.rpc("chat_customer_directory", { p_ids: ids });
      const result = (data ?? {}) as { customers?: typeof rows };
      rows = result.customers ?? [];
    }
    for (const p of rows) {
      const name = p.full_name?.trim() || p.email || "Client";
      profiles[p.id] = name;
      customers[p.id] = { id: p.id, name, email: p.email, phone: p.phone };
    }
  }

  const sessionIds = sessions.map((s) => s.id);
  const unread: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: msgRows } = await supabase
      .from("chat_messages")
      .select("session_id")
      .eq("read", false)
      .eq("sender_role", asAdmin ? "user" : "admin")
      .in("session_id", sessionIds);
    for (const r of (msgRows ?? []) as { session_id: string }[]) {
      unread[r.session_id] = (unread[r.session_id] ?? 0) + 1;
    }
  }

  const { data: onlineCount, error: onlineErr } = await supabase.rpc("admin_online_count");
  const agentOnline = onlineErr
    ? null
    : typeof onlineCount === "number"
      ? onlineCount > 0
      : Number(onlineCount) > 0;

  return {
    ok: true,
    sessions,
    profiles,
    customers,
    unread,
    counts: page.counts,
    nextCursor: page.next_cursor,
    serverNow: page.server_now,
    agentOnline,
    staffRole: role,
  };
}

export async function loadLiveChatMessagesAction(
  sessionId: string,
  opts: { beforeCreatedAt?: string | null; beforeId?: string | null; limit?: number } = {},
): Promise<{
  ok: boolean;
  error?: string;
  messages?: ChatMessage[];
  hasMore?: boolean;
  serverNow?: string;
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data: session } = await supabase.from("chat_sessions").select("id, user_id").eq("id", sessionId).maybeSingle();
  if (!session) return { ok: false, error: "Chat session not found." };
  const role = await getStaffRole(supabase);
  const isAdmin = await isAdminUser();
  if (!isAdmin && !role && session.user_id !== user.id) return { ok: false, error: "Not authorized" };

  const { data, error: rpcErr } = await supabase.rpc("chat_messages_page", {
    p_session_id: sessionId,
    p_before_created_at: opts.beforeCreatedAt ?? null,
    p_before_id: opts.beforeId ?? null,
    p_limit: opts.limit ?? 50,
  });

  if (rpcErr) {
    if (rpcErr.code === "42883") {
      return { ok: false, error: "Live chat message history needs the latest database migration." };
    }
    return { ok: false, error: rpcErr.message };
  }

  const page = (data ?? {}) as ChatMessagePage;
  return {
    ok: true,
    messages: (page.messages ?? []) as ChatMessage[],
    hasMore: !!page.has_more,
    serverNow: page.server_now,
  };
}

export async function markChatReadAction(sessionId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const role = await getStaffRole(supabase);
  const incomingRole = role ? "user" : "admin";
  const { error: updErr } = await supabase
    .from("chat_messages")
    .update({ read: true })
    .eq("session_id", sessionId)
    .eq("sender_role", incomingRole)
    .eq("read", false);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

export async function startChatSessionAction(): Promise<ActionResult & { sessionId?: string; session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  // A "New chat" request must never silently resume an old case.
  // The partial unique index still protects against concurrent starts.
  const { data: existing, error: existingError } = await supabase
    .from("chat_sessions")
    .select("id, reference_id, status")
    .eq("user_id", user.id)
    .in("status", ["waiting", "active", "pending_client"])
    .limit(1)
    .maybeSingle();

  if (existingError) return { ok: false, error: existingError.message };
  if (existing) {
    return {
      ok: false,
      error: `Case ${existing.reference_id ?? existing.id} is still ${existing.status}. End that case before starting a completely new one, or continue it from your session list.`,
    };
  }

  const { data: session, error: insertError } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, status: "waiting" })
    .select("*")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      // A concurrent request may have created an active case, but it is
      // not a new case for THIS request. Never silently return its ID.
      return { ok: false, error: "You already have an open case. Return to your session list or end it before starting a new chat." };
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
  // Return the actual inserted row so the UI can render the new case even
  // before the queue's next database refresh, without borrowing a prior case.
  return {
    ok: true,
    referenceId: session.reference_id,
    sessionId: session.id,
    session: session as ChatSession,
  };
}

export async function joinChatSessionAction(sessionId: string): Promise<
  ActionResult & {
    joined?: boolean;
    welcome?: boolean;
    adminName?: string | null;
    status?: string;
    assignedAdminId?: string | null;
  }
> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  if (!(await isAdminUser())) return { ok: false, error: "Not authorized" };

  const joined = await runJoinChatSession(supabase, sessionId);
  if (!joined.ok) {
    const msg = (joined.error ?? "").toLowerCase();
    if (
      msg.includes("join_chat_session") ||
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("function")
    ) {
      return {
        ok: false,
        error: "Admin join is not available on the server. Apply the live chat join migration, then retry.",
      };
    }
    if (joined.error.toLowerCase().includes("already assigned")) {
      return { ok: false, error: "Another agent already owns this case. Ask a supervisor to transfer it." };
    }
    return { ok: false, error: joined.error };
  }

  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return {
    ok: true,
    joined: !!joined.result.joined,
    welcome: !!joined.result.welcome,
    adminName: joined.result.admin_name ?? null,
    status: joined.result.status,
    assignedAdminId: joined.result.assigned_admin_id ?? null,
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

  const role = await getStaffRole(supabase);
  const isAdmin = await isAdminUser();
  const isStaff = !!role || isAdmin;
  if (!isStaff && session.user_id !== user.id) return { ok: false, error: "Not authorized" };
  const senderRole: "user" | "admin" = isStaff ? "admin" : "user";

  if (isStaff && session.status === "resolved") {
    return { ok: false, error: "This case is resolved. Reopen it before replying." };
  }

  const insertPayload = {
    session_id: session.id,
    sender_id: user.id,
    sender_role: senderRole,
    message: text,
    kind: "message",
  };

  let { error: msgError } = await supabase.from("chat_messages").insert(insertPayload);
  if (msgError && msgError.code === "PGRST204") {
    const retry = await supabase.from("chat_messages").insert({
      session_id: session.id,
      sender_id: user.id,
      sender_role: senderRole,
      message: text,
    });
    msgError = retry.error;
  }
  if (msgError) {
    const m = (msgError.message ?? "").toLowerCase();
    if (m.includes("not authorized to reply")) {
      return { ok: false, error: "You are not the assigned agent for this case." };
    }
    if (m.includes("case is not active")) {
      return { ok: false, error: "This case is no longer active." };
    }
    return { ok: false, error: msgError.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", session.user_id)
    .maybeSingle();

  await notifyChatMessage({
    userId: senderRole === "admin" ? session.user_id : null,
    userEmail: profile?.email ?? "",
    userName: profile?.full_name ?? "Client",
    referenceId: session.reference_id ?? "",
    senderRole,
    preview: text,
  });

  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return { ok: true, referenceId: session.reference_id ?? undefined };
}

/** Read back the exact committed row after a transition.
 * An RPC response alone is not evidence that the database status persisted. */
async function verifyChatSessionStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  expected: ChatSession["status"],
): Promise<(ActionResult & { session?: ChatSession })> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Case status could not be confirmed from the database. Refresh and retry." };
  }
  const session = data as ChatSession;
  if (session.status !== expected) {
    return {
      ok: false,
      status: session.status,
      session,
      error: `Case status is still ${session.status}, not ${expected}. No success was reported; refresh before taking another action.`,
    };
  }
  return { ok: true, session, status: session.status, referenceId: session.reference_id ?? undefined };
}

export async function resolveChatSessionAction(
  id: string,
  summary?: string,
): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("resolve_chat_session", {
    p_session_id: id,
    p_summary: summary ?? null,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const result = (data ?? {}) as { ok?: boolean; status?: string };
  if (result.ok !== true || result.status !== "resolved") {
    return { ok: false, error: "Resolve was not confirmed by the database." };
  }
  const persisted = await verifyChatSessionStatus(supabase, id, "resolved");
  if (!persisted.ok) return persisted;
  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return persisted;
}

export async function closeChatSessionAction(
  id: string,
  reason?: string,
): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("close_chat_session", {
    p_session_id: id,
    p_reason: reason ?? null,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const result = (data ?? {}) as { ok?: boolean; status?: string };
  if (result.ok !== true || result.status !== "closed") {
    return { ok: false, error: "Close was not confirmed by the database." };
  }
  const persisted = await verifyChatSessionStatus(supabase, id, "closed");
  if (!persisted.ok) return persisted;
  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return persisted;
}

export async function clientEndChatSessionAction(id: string): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("client_end_chat_session", {
    p_session_id: id,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const result = (data ?? {}) as { ok?: boolean; status?: string };
  if (result.ok !== true || result.status !== "resolved") {
    return { ok: false, error: "End session was not confirmed by the database." };
  }
  const persisted = await verifyChatSessionStatus(supabase, id, "resolved");
  if (!persisted.ok) return persisted;
  revalidatePath("/dashboard/chat");
  return persisted;
}

export async function reopenChatSessionAction(
  id: string,
  reason: string,
): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("reopen_chat_session", {
    p_session_id: id,
    p_reason: reason,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const result = (data ?? {}) as { ok?: boolean; status?: string };
  if (result.ok !== true || result.status !== "active") {
    return { ok: false, error: "Reopen was not confirmed by the database." };
  }
  const persisted = await verifyChatSessionStatus(supabase, id, "active");
  if (!persisted.ok) return persisted;
  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return persisted;
}

export async function loadChatAgentEventsAction(sessionId: string): Promise<{
  ok: boolean;
  error?: string;
  events?: ChatAgentEvent[];
  unavailable?: boolean;
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const staffRole = await getStaffRole(supabase);
  if (!staffRole && !(await isAdminUser())) return { ok: false, error: "Not authorized" };

  const { data, error: qErr } = await supabase
    .from("chat_agent_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (qErr) {
    if (qErr.code === "42P01" || qErr.code === "PGRST205") {
      return { ok: true, events: [], unavailable: true };
    }
    return { ok: false, error: qErr.message };
  }
  return { ok: true, events: (data ?? []) as ChatAgentEvent[] };
}

export async function addChatInternalNoteAction(input: {
  sessionId: string;
  body: string;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const staffRole = await getStaffRole(supabase);
  if (!staffRole && !(await isAdminUser())) return { ok: false, error: "Not authorized" };

  const body = input.body.trim();
  if (body.length < 2) return { ok: false, error: "Add a note before saving." };
  if (body.length > 4000) return { ok: false, error: "Note is too long." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const authorName =
    (profile as { full_name?: string | null; email?: string | null } | null)?.full_name ||
    (profile as { email?: string | null } | null)?.email ||
    "Support Agent";

  const { error: insertError } = await supabase.from("chat_agent_events").insert({
    session_id: input.sessionId,
    author_id: user.id,
    author_name: authorName,
    kind: "note",
    body,
  });
  if (insertError) {
    if (insertError.code === "42P01" || insertError.code === "PGRST205") {
      return {
        ok: false,
        error: "Internal notes need the latest database migration before they can be saved.",
      };
    }
    return { ok: false, error: insertError.message };
  }
  return { ok: true };
}

export async function escalateChatSessionAction(input: {
  sessionId: string;
  targetType: "staff" | "role" | "team" | "department";
  targetStaffId?: string | null;
  targetRole?: string | null;
  targetTeamId?: string | null;
  targetDepartmentId?: string | null;
  reason: string;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const role = await getStaffRole(supabase);
  if (!role) return { ok: false, error: "Not authorized" };

  const reason = input.reason.trim();
  if (reason.length < 3) return { ok: false, error: "Record a reason before escalating." };
  if (reason.length > 2000) return { ok: false, error: "Escalation reason is too long." };

  const { error: rpcErr } = await supabase.rpc("create_chat_escalation", {
    p_session_id: input.sessionId,
    p_target_type: input.targetType,
    p_target_staff_id: input.targetStaffId ?? null,
    p_target_role: input.targetRole ?? null,
    p_target_team_id: input.targetTeamId ?? null,
    p_target_department_id: input.targetDepartmentId ?? null,
    p_reason: reason,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function respondChatEscalationAction(input: {
  escalationId: string;
  action: "accept" | "reject" | "return" | "cancel";
  reason?: string | null;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const role = await getStaffRole(supabase);
  if (!role) return { ok: false, error: "Not authorized" };

  const { error: rpcErr } = await supabase.rpc("respond_chat_escalation", {
    p_escalation_id: input.escalationId,
    p_action: input.action,
    p_reason: input.reason ?? null,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function claimChatSessionAction(sessionId: string): Promise<
  ActionResult & { assignedAdminId?: string | null; assignedAdminName?: string | null }
> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("claim_chat_session", {
    p_session_id: sessionId,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  const result = (data ?? {}) as {
    status?: string;
    assigned_admin_id?: string | null;
    assigned_admin_name?: string | null;
  };
  return {
    ok: true,
    status: result.status,
    assignedAdminId: result.assigned_admin_id ?? null,
    assignedAdminName: result.assigned_admin_name ?? null,
  };
}

export async function assignChatSessionAction(input: {
  sessionId: string;
  assigneeId: string | null;
  teamId?: string | null;
  departmentId?: string | null;
  reason?: string | null;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("assign_chat_session", {
    p_session_id: input.sessionId,
    p_assignee_id: input.assigneeId,
    p_team_id: input.teamId ?? null,
    p_department_id: input.departmentId ?? null,
    p_reason: input.reason ?? null,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  const result = (data ?? {}) as { status?: string; assigned_admin_name?: string | null };
  return { ok: true, status: result.status };
}

export async function offerChatSessionAction(input: {
  sessionId: string;
  targetStaffId: string;
  reason: string;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { error: rpcErr } = await supabase.rpc("offer_chat_session", {
    p_session_id: input.sessionId,
    p_target_staff_id: input.targetStaffId,
    p_reason: input.reason,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function respondChatAssignmentAction(input: {
  assignmentId: string;
  accept: boolean;
  reason?: string | null;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { data, error: rpcErr } = await supabase.rpc("respond_chat_assignment", {
    p_assignment_id: input.assignmentId,
    p_accept: input.accept,
    p_reason: input.reason ?? null,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  const result = (data ?? {}) as { accepted?: boolean; status?: string };
  return { ok: true, status: result.status };
}

export async function returnChatSessionToQueueAction(input: {
  sessionId: string;
  reason: string;
}): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  if (input.reason.trim().length < 3) return { ok: false, error: "A reason is required." };

  const { error: rpcErr } = await supabase.rpc("return_chat_session_to_queue", {
    p_session_id: input.sessionId,
    p_reason: input.reason.trim(),
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const persisted = await verifyChatSessionStatus(supabase, input.sessionId, "waiting");
  if (!persisted.ok) return persisted;

  revalidatePath("/admin/chat");
  return persisted;
}

export async function updateChatPriorityAction(input: {
  sessionId: string;
  priority: (typeof CHAT_PRIORITIES)[number];
}): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  if (!(await isAdminUser()) && !(await getStaffRole(supabase))) {
    return { ok: false, error: "Not authorized" };
  }

  if (!(CHAT_PRIORITIES as readonly string[]).includes(input.priority)) {
    return { ok: false, error: "Invalid priority" };
  }

  const { error: rpcErr } = await supabase.rpc("set_chat_priority", {
    p_session_id: input.sessionId,
    p_priority: input.priority,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const { data: row, error: readErr } = await supabase.from("chat_sessions")
    .select("*").eq("id", input.sessionId).maybeSingle();
  if (readErr || !row || row.priority !== input.priority) {
    return { ok: false, error: "Priority could not be confirmed from the database. Refresh and retry." };
  }
  return { ok: true, session: row as ChatSession, status: row.status };
}

export async function markChatPendingClientAction(sessionId: string): Promise<ActionResult & { session?: ChatSession }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { error: rpcErr } = await supabase.rpc("mark_chat_pending_client", {
    p_session_id: sessionId,
  });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };
  const persisted = await verifyChatSessionStatus(supabase, sessionId, "pending_client");
  if (!persisted.ok) return persisted;

  revalidatePath("/admin/chat");
  return persisted;
}

export async function setChatAgentStatusAction(
  status: "available" | "busy" | "away" | "offline",
): Promise<ActionResult> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };

  const { error: rpcErr } = await supabase.rpc("set_my_agent_status", { p_status: status });
  if (rpcErr) return { ok: false, error: chatRpcError(rpcErr.message) };

  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function loadChatCaseTimelineAction(
  sessionId: string,
): Promise<{ ok: boolean; error?: string; timeline?: ChatTimelineResult }> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const role = await getStaffRole(supabase);
  if (!role) return { ok: false, error: "Not authorized" };

  const { data, error: rpcErr } = await supabase.rpc("chat_case_timeline", {
    p_session_id: sessionId,
    p_limit: 100,
  });
  if (rpcErr) {
    if (rpcErr.code === "42883") {
      return { ok: false, error: "Case timeline needs the latest database migration." };
    }
    return { ok: false, error: rpcErr.message };
  }
  return { ok: true, timeline: (data ?? {}) as ChatTimelineResult };
}

export async function loadChatStaffDirectoryAction(): Promise<{
  ok: boolean;
  error?: string;
  staff?: ChatStaffMember[];
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const role = await getStaffRole(supabase);
  if (!role) return { ok: false, error: "Not authorized" };

  const { data, error: rpcErr } = await supabase.rpc("chat_staff_directory");
  if (rpcErr) {
    if (rpcErr.code === "42883") return { ok: true, staff: [] };
    return { ok: false, error: rpcErr.message };
  }
  const result = (data ?? {}) as { staff?: ChatStaffMember[] };
  return { ok: true, staff: result.staff ?? [] };
}

export async function loadChatRoutingDirectoryAction(): Promise<{
  ok: boolean;
  error?: string;
  departments?: ChatDepartment[];
  teams?: ChatTeam[];
}> {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false, error };
  const role = await getStaffRole(supabase);
  if (!role) return { ok: false, error: "Not authorized" };

  const { data, error: rpcErr } = await supabase.rpc("chat_routing_directory");
  if (rpcErr) {
    if (rpcErr.code === "42883") return { ok: true, departments: [], teams: [] };
    return { ok: false, error: rpcErr.message };
  }
  const result = (data ?? {}) as { departments?: ChatDepartment[]; teams?: ChatTeam[] };
  return { ok: true, departments: result.departments ?? [], teams: result.teams ?? [] };
}

/** Maps a database RPC error message to a user-facing message. */
function chatRpcError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("already assigned")) return "Another agent already owns this case.";
  if (m.includes("already has another active case")) {
    return "This client already has another active case. Resolve it first.";
  }
  if (m.includes("already active for this case") || m.includes("escalation is already active")) {
    return "An escalation is already active for this case.";
  }
  if (m.includes("offer is already pending")) return "An offer is already pending for this case.";
  if (m.includes("not authorized")) return "You do not have permission for this action.";
  if (m.includes("not staff")) return "Only support staff can perform this action.";
  if (m.includes("case is not active") || m.includes("case is not resolved")) {
    return "This action is not valid for the current case state.";
  }
  if (m.includes("does not exist") || m.includes("could not find the function")) {
    return "Live chat needs the latest database migration. Apply it, then retry.";
  }
  return message || "Something went wrong. Please retry.";
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
