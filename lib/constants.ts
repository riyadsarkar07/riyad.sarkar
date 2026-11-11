/* ------------------------------------------------------------------ */
/*  Shared constants for appointments, support and admin               */
/* ------------------------------------------------------------------ */

/**
 * Client-facing appointment columns. Deliberately excludes admin_notes so
 * private staff notes never reach the browser via `select("*")`.
 */
export const APPOINTMENT_CLIENT_COLUMNS =
  "id, reference_id, user_id, full_name, email, phone, service, appointment_date, appointment_time, timezone, priority, problem_description, additional_details, preferred_contact, status, created_at, updated_at" as const;

export const APPOINTMENT_SERVICES = [
  "Facebook Account Recovery",
  "Facebook Page Recovery",
  "Business Manager Recovery",
  "Instagram Recovery",
  "Meta Verified Assistance",
  "YouTube Recovery",
  "Google Account Recovery",
  "Copyright Support",
  "Fake Account Removal",
  "Digital Identity Protection",
  "Account Security",
  "Cyber Security Consultation",
  "Website Security",
  "DNS & Domain Support",
] as const;

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "reschedule_requested",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Live chat adds a `critical` level that supervisors/admins may set.
 * Kept separate from PRIORITIES so Support Inbox and Appointments keep
 * their existing four-level constraints untouched.
 */
export const CHAT_PRIORITIES = ["low", "normal", "high", "urgent", "critical"] as const;
export type ChatPriority = (typeof CHAT_PRIORITIES)[number];

export const CHAT_STAFF_ROLES = ["agent", "senior_agent", "supervisor", "admin"] as const;
export type ChatStaffRole = (typeof CHAT_STAFF_ROLES)[number];

export const CHAT_STAFF_ROLE_LABELS: Record<ChatStaffRole, string> = {
  agent: "Agent",
  senior_agent: "Senior Agent",
  supervisor: "Supervisor",
  admin: "Admin",
};

/** Numeric rank must match public.staff_rank() in the database. */
export const CHAT_STAFF_RANK: Record<ChatStaffRole, number> = {
  agent: 1,
  senior_agent: 2,
  supervisor: 3,
  admin: 4,
};

export const AGENT_STATUSES = ["available", "busy", "away", "offline"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  available: "Available",
  busy: "Busy",
  away: "Away",
  offline: "Offline",
};

export const ESCALATION_TARGET_TYPES = ["staff", "role", "team", "department"] as const;
export type EscalationTargetType = (typeof ESCALATION_TARGET_TYPES)[number];

export const ESCALATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "returned",
  "cancelled",
  "resolved",
] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export const CONTACT_METHODS = ["email", "whatsapp", "phone"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const TICKET_CATEGORIES = [
  "account_recovery",
  "appointment",
  "payment",
  "technical_issue",
  "security",
  "general",
  "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = ["open", "pending", "in_progress", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const EMAIL_TICKET_STATUSES = ["open", "in_progress", "awaiting_reply", "resolved"] as const;
export type EmailTicketStatus = (typeof EMAIL_TICKET_STATUSES)[number];

export const CHAT_SESSION_STATUSES = ["waiting", "active", "pending_client", "resolved", "closed"] as const;
export type ChatSessionStatus = (typeof CHAT_SESSION_STATUSES)[number];

export const PUBLIC_BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
export type PublicBookingStatus = (typeof PUBLIC_BOOKING_STATUSES)[number];

export const TIMEZONES = [
  "Asia/Dhaka (GMT+6)",
  "Asia/Kolkata (GMT+5:30)",
  "Asia/Singapore (GMT+8)",
  "Asia/Dubai (GMT+4)",
  "Asia/Riyadh (GMT+3)",
  "Europe/London (GMT+0)",
  "Europe/Berlin (GMT+1)",
  "America/New_York (GMT-5)",
  "America/Chicago (GMT-6)",
  "America/Los_Angeles (GMT-8)",
  "UTC (GMT+0)",
] as const;

export const TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
  "08:30 PM",
] as const;

export const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Maps a stored timezone value to one of the TIMEZONES options.
 * The database stores bare IANA names ("Asia/Dhaka") while the UI options
 * include a GMT label ("Asia/Dhaka (GMT+6)"), so both forms must match.
 */
export function matchTimezoneOption(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return (TIMEZONES as readonly string[]).find(
    (tz) => tz === trimmed || tz.split(" ")[0] === trimmed,
  );
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  reschedule_requested: "Reschedule Requested",
  open: "Open",
  closed: "Closed",
  awaiting_reply: "Awaiting Reply",
  resolved: "Resolved",
  waiting: "Waiting",
  active: "Active",
  pending_client: "Waiting for Customer",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
  critical: "Critical",
};

export const CATEGORY_LABELS: Record<string, string> = {
  account_recovery: "Account Recovery",
  appointment: "Appointment",
  payment: "Payment",
  technical_issue: "Technical Issue",
  security: "Security",
  general: "General",
  other: "Other",
};
