import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isDashboard = url.pathname.startsWith('/dashboard');
  const isAuth =
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/reset-password');
  const isAuthCallback = url.pathname.startsWith('/auth/callback');
  const isPublicApi = url.pathname.startsWith('/api/v1');
  const isDemoLogin = url.pathname.startsWith('/api/demo-login');

  // Allow public API routes without auth
  if (isPublicApi) {
    return supabaseResponse;
  }

  // Allow auth callback
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // Allow demo login route without auth
  if (isDemoLogin) {
    return supabaseResponse;
  }

  // Redirect authenticated users away from auth pages
  if (isAuth && user) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Protect dashboard routes - redirect unauthenticated to login
  if (isDashboard && !user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
