import { NextResponse } from 'next/server';
import { supabase } from '../../../../src/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mapAuthError(error: { message?: string; code?: string }): { message: string; code: string } {
  const errorMessage = (error.message || '')?.toLowerCase() || '';

  if (errorMessage.includes('invalid login credentials')) {
    return { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
  }
  if (errorMessage.includes('email not confirmed')) {
    return { message: 'Email not confirmed. Please check your email', code: 'EMAIL_NOT_CONFIRMED' };
  }
  if (errorMessage.includes('user not found')) {
    return { message: 'Email not registered', code: 'USER_NOT_FOUND' };
  }
  if (errorMessage.includes('user_not_found')) {
    return { message: 'Email not registered', code: 'USER_NOT_FOUND' };
  }
  if (errorMessage.includes('password')) {
    return { message: 'Invalid password', code: 'INVALID_PASSWORD' };
  }

  return { message: (error.message || 'Login failed'), code: 'UNKNOWN_ERROR' };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters', code: 'INVALID_PASSWORD' },
        { status: 400 }
      );
    }

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('SignIn error', error);
      const { message, code } = mapAuthError(error);

      // If the error indicates the email is not confirmed and we have a service key,
      // try to confirm the email via the admin API and retry signing in.
      if (SERVICE_ROLE_KEY && code === 'EMAIL_NOT_CONFIRMED') {
        try {
          // Find the user by email using admin endpoint
          const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(
            email
          )}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              apikey: SERVICE_ROLE_KEY,
            },
          });

          const listJson = await listRes.json().catch(() => null);
          const userEntry = Array.isArray(listJson) ? listJson[0] : listJson;
          const userId = userEntry?.id;

          if (userId) {
            // Confirm the user's email
            const updRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                apikey: SERVICE_ROLE_KEY,
              },
              body: JSON.stringify({ email_confirm: true }),
            });

            if (updRes.ok) {
              // Retry sign in after confirming
              const retry = await supabase.auth.signInWithPassword({ email, password });
              if (retry.error) {
                const { message: retryMsg, code: retryCode } = mapAuthError(retry.error);
                return NextResponse.json(
                  { error: retryMsg, code: retryCode },
                  { status: 401 }
                );
              }
              return NextResponse.json({
                user: retry.data.user ?? null,
                session: retry.data.session ?? null,
                email: retry.data.user?.email
              }, { status: 200 });
            } else {
              console.error('Failed to confirm user via admin', { status: updRes.status });
            }
          }
        } catch (e) {
          console.error('Error while trying to confirm user via admin', e);
        }
      }

      return NextResponse.json(
        { error: message, code },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: data.user ?? null,
      session: data.session ?? null,
      email: data.user?.email
    }, { status: 200 });
  } catch (err) {
    console.error('Login server error:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again later', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
