import type {
  AgentStatus,
  AppointmentStatus,
  ChatSessionStatus,
  ChatPriority,
  ChatStaffRole,
  ContactMethod,
  EscalationStatus,
  EscalationTargetType,
  Priority,
  TicketCategory,
  TicketStatus,
} from "@/lib/constants";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  timezone: string;
  role: "user" | "admin";
  staff_role?: ChatStaffRole | null;
  agent_status?: AgentStatus;
  max_concurrent_cases?: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  reference_id: string | null;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  service: string;
  appointment_date: string;
  appointment_time: string;
  timezone: string;
  priority: Priority;
  problem_description: string;
  additional_details: string | null;
  preferred_contact: ContactMethod;
  status: AppointmentStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFile {
  id: string;
  appointment_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  reference_id: string | null;
  user_id: string;
  appointment_id: string | null;
  subject: string;
  category: TicketCategory;
  priority: Priority;
  status: TicketStatus;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: "user" | "admin";
  message: string;
  attachment_file_id: string | null;
  read: boolean;
  created_at: string;
}

export interface SupportFile {
  id: string;
  ticket_id: string;
  user_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
}

export interface EmailTicket {
  id: string;
  reference_id: string | null;
  user_id: string | null;
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
}

export interface EmailTicketReply {
  id: string;
  ticket_id: string;
  sender_role: "user" | "admin";
  sender_id: string | null;
  message: string;
  created_at: string;
}

export interface ConsultationBooking {
  id: string;
  reference_id: string | null;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  service: string;
  appointment_date: string;
  appointment_time: string;
  timezone: string;
  case_description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  reference_id: string | null;
  user_id: string;
  status: ChatSessionStatus;
  priority?: ChatPriority;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  team_id?: string | null;
  department_id?: string | null;
  joined_at?: string | null;
  welcome_sent_at?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  closed_at?: string | null;
  reopened_at?: string | null;
  reopen_count?: number;
  version?: number;
  first_response_due_at?: string | null;
  resolution_due_at?: string | null;
  first_response_at?: string | null;
  first_response_breached?: boolean | null;
  resolution_breached?: boolean | null;
  sla_paused_since?: string | null;
  active_escalations?: number | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatAssignment {
  id: string;
  assignee_id: string | null;
  assignee_name: string | null;
  from_assignee_id: string | null;
  status: "offered" | "accepted" | "rejected" | "returned" | "cancelled" | "completed";
  reason: string | null;
  decision_reason: string | null;
  created_at: string;
  ended_at: string | null;
  end_reason: string | null;
}

export interface ChatEscalation {
  id: string;
  target_type: EscalationTargetType;
  target_staff_id: string | null;
  target_role: string | null;
  target_team_id: string | null;
  target_department_id: string | null;
  reason: string;
  status: EscalationStatus;
  decision_reason: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ChatCaseEvent {
  id: string;
  event_type: string;
  actor_name: string | null;
  actor_role: string | null;
  from_value: string | null;
  to_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatStaffMember {
  id: string;
  name: string;
  staff_role: ChatStaffRole;
  agent_status: AgentStatus;
  active_cases: number;
}

export interface ChatDepartment {
  id: string;
  name: string;
  slug: string;
}

export interface ChatTeam {
  id: string;
  name: string;
  department_id: string;
}

export interface ChatCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface ChatAgentEvent {
  id: string;
  session_id: string;
  author_id: string | null;
  author_name: string | null;
  kind: "note" | "escalation";
  body: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: "user" | "admin";
  sender_name?: string | null;
  kind?: "message" | "welcome";
  message: string;
  read: boolean;
  created_at: string;
}

export interface DashboardStats {
  upcoming: number;
  pending: number;
  openTickets: number;
  completed: number;
}
