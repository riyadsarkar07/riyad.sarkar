import { z } from "zod";
import { consultationTimes } from "@/data/content";

export const consultationFormSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(120, "Email is too long."),
  phone: z.string().trim().min(6, "Please enter a valid phone / WhatsApp number.").max(40, "Phone is too long."),
  service: z.string().trim().min(2, "Please select a service.").max(120, "Service is too long."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a date."),
  time: z
    .string()
    .min(1, "Please select a time.")
    .refine((value) => consultationTimes.includes(value), { message: "Please select a valid time." }),
  message: z
    .string()
    .trim()
    .min(10, "Please describe your case (at least 10 characters).")
    .max(4000, "Description is too long."),
  website: z.string().optional(),
  startedAt: z.number().optional(),
  submissionId: z.string().uuid("Invalid submission."),
});

export type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

export type ConsultationActionResult =
  | { ok: true; referenceId: string; emailDelivered: boolean; emailWarning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
