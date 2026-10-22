import type { Metadata } from "next";
import { Consultation } from "@/components/sections/consultation";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Book a Consultation",
  description:
    "Schedule a private session with Riyad Sarkar for account recovery, cyber security audit or business protection strategy. Choose an available date and time.",
  path: "/consultation",
});

export default function ConsultationPage() {
  return <Consultation variant="page" />;
}
