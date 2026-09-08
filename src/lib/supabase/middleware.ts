import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AWAD_COMMAND_SCHEMA, isAuthConfigured } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!isAuthConfigured()) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createServerClient(url, anon, {
    db: { schema: AWAD_COMMAND_SCHEMA },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicPath =
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/api/') ||
    path === '/awad-command-preview.html';

  if (!user && !publicPath) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    return NextResponse.redirect(redirect);
  }

  if (user && path.startsWith('/login')) {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    return NextResponse.redirect(home);
  }

  return response;
}
