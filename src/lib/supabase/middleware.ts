import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AWAD_COMMAND_SCHEMA, allowedEmail, isAuthConfigured } from "@/lib/env";

export function isPublicEntry(path: string, method: string) {
  return (
    path === "/login" ||
    path === "/auth/callback" ||
    (path === "/api/lead-inbound" && method === "POST")
  ); // Route verifies the hub bearer secret.
}
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  const path = request.nextUrl.pathname;
  let owner = false;
  if (isAuthConfigured()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        db: { schema: AWAD_COMMAND_SCHEMA },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      owner =
        !!user && user.email?.toLowerCase() === allowedEmail().toLowerCase();
    } catch {
      owner = false;
    }
  }
  let result = response;
  if (!owner && !isPublicEntry(path, request.method)) {
    if (path.startsWith("/api/"))
      result = NextResponse.json(
        { error: "Owner sign-in required." },
        { status: 401 },
      );
    else {
      const target = request.nextUrl.clone();
      target.pathname = "/login";
      target.search = "";
      result = NextResponse.redirect(target);
    }
  } else if (owner && path === "/login") {
    const target = request.nextUrl.clone();
    target.pathname = "/";
    target.search = "";
    result = NextResponse.redirect(target);
  }
  if (result !== response)
    for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
  result.headers.set("Cache-Control", "private, no-store");
  result.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return result;
}
