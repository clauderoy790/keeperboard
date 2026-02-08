import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const safeNext = next && next.startsWith('/') ? next : null;
  const redirectPath =
    type === 'recovery'
      ? safeNext || '/update-password'
      : safeNext || '/dashboard';

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
