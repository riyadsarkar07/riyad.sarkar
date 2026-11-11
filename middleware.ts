import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { safeNextPath } from "@/lib/safe-path";

/**
 * Route guard:
 *  - /dashboard* requires a signed-in user
 *  - /admin*     requires a signed-in user. Full admins may use every page;
 *                support staff (agent/senior_agent/supervisor) are limited to
 *                /admin/chat and are redirected there from other admin pages.
 *  - /login, /signup, /reset-password redirect to dashboard if signed in
 *  - /forgot-password stays reachable while signed in so signed-in users can
 *    complete the OTP password-recovery flow (e.g. from the profile page).
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, isAdmin, staffRole } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/appointments")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const next = pathname + (request.nextUrl.search || "");
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const isStaff = isAdmin || !!staffRole;

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password"
  ) {
    const url = request.nextUrl.clone();
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    if (next && !(isStaff && (next === "/dashboard" || next.startsWith("/dashboard/chat")))) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    url.pathname = isAdmin ? "/admin" : isStaff ? "/admin/chat" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isStaff && pathname === "/dashboard/chat") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/chat";
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (isStaff && pathname.startsWith("/admin") && !isAdmin) {
    const allowed = pathname === "/admin/chat" || pathname.startsWith("/admin/chat/");
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/chat";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/appointments/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
  ],
};
