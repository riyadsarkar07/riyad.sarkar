import type { Metadata } from "next";
import { Consultation } from "@/components/sections/consultation";
import { buildMetadata } from "@/lib/seo";

export const maxDuration = 30;

export const metadata: Metadata = buildMetadata({
  title: "Book a Consultation",
  description:
    "Request a private session with Riyad Sarkar for account recovery, cyber security audit or business protection strategy. Choose a preferred date and time.",
  path: "/consultation",
});

export default function ConsultationPage() {
  return <Consultation variant="page" />;
}
