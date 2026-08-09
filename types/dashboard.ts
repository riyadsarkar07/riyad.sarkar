import type {
  AppointmentStatus,
  ContactMethod,
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

export interface DashboardStats {
  upcoming: number;
  pending: number;
  openTickets: number;
  completed: number;
}
