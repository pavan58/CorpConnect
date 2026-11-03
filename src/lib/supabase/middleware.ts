import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, attributionFromParams, encodeAttribution } from "@/lib/attribution";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/privacy", "/terms", "/sell", "/referrals", "/join"];
const PUBLIC_PREFIXES = ["/api/health", "/api/webhooks/"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the auth token if needed. Do not put logic between createServerClient and getUser.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  // Middleware is only a convenience redirect. Every page/action re-checks the
  // session and verification status on the server (see lib/auth/guards.ts) and
  // RLS enforces it in the database.
  // First-touch attribution: keep the first campaign that brought this visitor.
  const attrib = attributionFromParams(request.nextUrl.searchParams);
  if (attrib && !request.cookies.get(ATTRIBUTION_COOKIE)) {
    response.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(attrib), {
      maxAge: ATTRIBUTION_MAX_AGE, path: "/", sameSite: "lax", httpOnly: true, secure: request.nextUrl.protocol === "https:",
    });
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
