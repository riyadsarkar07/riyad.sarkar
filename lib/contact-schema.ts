import { z } from "zod";

export const PROJECT_TYPES = [
  "Website Development",
  "Web Application",
  "Security Consultation",
  "Other",
] as const;

export const BUDGET_RANGES = [
  "Under $500",
  "$500 – $1,500",
  "$1,500 – $5,000",
  "$5,000+",
  "Prefer not to say",
] as const;

export const PROJECT_TIMELINES = [
  "ASAP",
  "1–2 weeks",
  "1 month",
  "2–3 months",
  "Flexible",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type BudgetRange = (typeof BUDGET_RANGES)[number];
export type ProjectTimeline = (typeof PROJECT_TIMELINES)[number];

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(80, "Name is too long."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(120, "Email is too long."),
  projectType: z
    .string({ required_error: "Please select a project type." })
    .min(1, "Please select a project type.")
    .refine((value): value is ProjectType => (PROJECT_TYPES as readonly string[]).includes(value), {
      message: "Please select a project type.",
    }),
  budget: z.union([z.enum(BUDGET_RANGES), z.literal("")]).optional(),
  timeline: z.union([z.enum(PROJECT_TIMELINES), z.literal("")]).optional(),
  message: z
    .string()
    .trim()
    .min(20, "Please share a few more details (at least 20 characters).")
    .max(4000, "Message is too long (max 4000 characters)."),
  website: z.string().optional(),
  startedAt: z.number().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export type ContactActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
