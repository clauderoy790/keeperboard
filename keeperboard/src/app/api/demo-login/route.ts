import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Demo Login Route
 *
 * Called when users click app links from Claudium with demo mode enabled.
 *
 * IMPORTANT: This route checks for existing sessions first!
 * - If user is already logged in → just redirect (their session is untouched)
 * - If user is NOT logged in → sign in as demo user → redirect
 *
 * This ensures existing users (like the app owner) are never affected.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // CRITICAL: Check if user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Already logged in - redirect without touching their session
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Not logged in - sign in as demo user
  const { error } = await supabase.auth.signInWithPassword({
    email: 'demo@claudium.ai',
    password: process.env.DEMO_PASSWORD!,
  });

  if (error) {
    console.error('Demo login failed:', error.message);
    // On error, redirect to login page so user can sign in normally
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Success - redirect to home page
  return NextResponse.redirect(new URL('/', request.url));
}
