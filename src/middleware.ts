import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const PUBLIC_PATHS = new Set([
  "/login",
  "/auth/callback",
  "/manifest.json",
  "/sw.js",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return redirectWithSession(login, supabaseResponse);
  }

  if (user && pathname === "/login") {
    const next = request.nextUrl.clone();
    next.pathname = "/";
    next.search = "";
    return redirectWithSession(next, supabaseResponse);
  }

  if (user && !isPublicPath(pathname)) {
    const { data: profile, error } = await supabase
      .from("reckoning_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) {
      const complete = Boolean(profile);
      if (!complete && pathname !== "/onboarding") {
        const onboarding = request.nextUrl.clone();
        onboarding.pathname = "/onboarding";
        onboarding.search = "";
        return redirectWithSession(onboarding, supabaseResponse);
      }
      if (complete && pathname === "/onboarding") {
        const home = request.nextUrl.clone();
        home.pathname = "/";
        home.search = "";
        return redirectWithSession(home, supabaseResponse);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
