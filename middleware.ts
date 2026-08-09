import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Route guard:
 *  - /dashboard* requires a signed-in user
 *  - /admin*    requires a signed-in user (admin check happens in the layout)
 *  - /login, /signup, /forgot-password, /reset-password redirect to dashboard if signed in
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/appointments")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
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
