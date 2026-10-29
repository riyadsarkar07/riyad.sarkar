import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/safe-path";

/**
 * Handles email verification + password recovery redirects from Supabase.
 * Exchanges the auth code for a session and forwards the user on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: admin } = await supabase.rpc("is_admin");
      const dest =
        admin && (!next || next === "/dashboard" || next.startsWith("/dashboard/chat"))
          ? "/admin"
          : next ?? "/dashboard";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
