import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { buildMetadata } from "@/lib/seo";
import { profile } from "@/data/content";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Use",
  description: "Terms for using Riyad Sarkar’s website, consultation booking, and client portal.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="25 October 2026">
      <p>
        By using this website, creating an account, or requesting a consultation, you agree to these terms.
        If you do not agree, please do not use the services.
      </p>

      <h2>Services</h2>
      <p>
        {profile.name} provides digital recovery, cyber security consultation, and related professional services.
        Public booking and portal appointment requests are <strong>requests</strong> for a preferred time. A slot
        is not confirmed until it is accepted and marked confirmed by the team.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide accurate contact details and keep your password confidential.</li>
        <li>You are responsible for activity on your account.</li>
        <li>I may suspend access in cases of abuse, fraud, or security risk.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        You may only request help for accounts and assets you are authorised to recover or protect. Do not submit
        unlawful content, malware, or another person’s data without a legitimate basis.
      </p>

      <h2>Confidentiality</h2>
      <p>
        Case details, messages and files are treated as confidential and used only to deliver the requested service,
        except where disclosure is required by law.
      </p>

      <h2>No guaranteed outcome</h2>
      <p>
        Recovery and security work depends on platform policies and third-party systems. Past success rates described
        on the site are illustrative of professional experience, not a warranty for any individual case.
      </p>

      <h2>Liability</h2>
      <p>
        To the fullest extent permitted by law, liability is limited to the fees paid for the specific engagement.
        The site and portal are provided as-is, aside from duties that cannot be excluded.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated from time to time. Continued use after an update constitutes acceptance of the
        revised terms. Questions: {profile.email}.
      </p>
    </LegalPage>
  );
}
