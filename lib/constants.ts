/* ------------------------------------------------------------------ */
/*  Shared constants for appointments, support and admin               */
/* ------------------------------------------------------------------ */

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

export const CHAT_SESSION_STATUSES = ["waiting", "active", "closed"] as const;
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
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
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
