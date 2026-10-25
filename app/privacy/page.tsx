import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { buildMetadata } from "@/lib/seo";
import { profile } from "@/data/content";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Riyad Sarkar collects, uses and protects personal information on this website and client portal.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="25 October 2026">
      <p>
        This policy explains how {profile.name} (&quot;I&quot;, &quot;me&quot;) handles information you share through
        riyadsarkar.com, the consultation form, email support, and the authenticated client portal.
      </p>

      <h2>Information I collect</h2>
      <ul>
        <li>Account details you provide when you register: name, email, phone, and password (stored by the authentication provider).</li>
        <li>Consultation and appointment details: service type, preferred date and time, timezone, and case description.</li>
        <li>Support messages and optional file attachments you upload.</li>
        <li>Technical data needed to run the site, such as IP address for rate limiting and essential preference storage (theme, language).</li>
      </ul>

      <h2>How it is used</h2>
      <p>
        Information is used only to provide recovery and security services, confirm bookings, reply to support
        conversations, protect the service from abuse, and meet legal obligations. I do not sell personal data
        or use tracking advertising cookies.
      </p>

      <h2>Storage and security</h2>
      <p>
        Portal data is stored with Supabase under access controls. Files you attach are kept in private storage
        and are visible only to you and authorised administrators. Consultations are handled confidentially.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        Essential local storage is used for theme, language, cookie-consent choice, and similar preferences.
        No third-party advertising cookies are set. You can decline non-essential storage from the consent banner.
      </p>

      <h2>Retention</h2>
      <p>
        Account, appointment and support records are kept while your account is active and for a reasonable period
        afterwards so cases can be audited. You may request deletion of your account data by emailing{" "}
        {profile.email}.
      </p>

      <h2>Your choices</h2>
      <p>
        You can access or update profile details in the client portal, close support tickets, and request
        cancellation of appointments. For any privacy request, contact {profile.email}.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: {profile.email}. This page is a practical notice for clients and visitors;
        it is not a substitute for legal advice.
      </p>
    </LegalPage>
  );
}
