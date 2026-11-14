import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";

/** Prevent search engines from indexing sign-in and private portal routes. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
