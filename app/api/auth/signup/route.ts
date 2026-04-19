import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateInput(name: string, email: string, password: string): { valid: boolean; error?: string; code?: string } {
  if (!name || !email || !password) {
    return { valid: false, error: 'Name, email, and password are required', code: 'MISSING_FIELDS' };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters', code: 'INVALID_NAME' };
  }

  if (!email.includes('@') || !email.includes('.')) {
    return { valid: false, error: 'Invalid email format', code: 'INVALID_EMAIL' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long', code: 'PASSWORD_TOO_LONG' };
  }

  return { valid: true };
}

function mapSignupError(error: { message?: string; code?: string }): { message: string; code: string } {
  const errorMessage = (error.message || '')?.toLowerCase() || '';
  const errorCode = (error.code || '')?.toLowerCase() || '';

  if (errorMessage.includes('already') || errorCode.includes('user_already_exists')) {
    return { message: 'Email already registered', code: 'EMAIL_ALREADY_EXISTS' };
  }
  if (errorMessage.includes('invalid email')) {
    return { message: 'Invalid email format', code: 'INVALID_EMAIL' };
  }
  if (errorMessage.includes('password')) {
    return { message: 'Password does not meet requirements', code: 'INVALID_PASSWORD' };
  }

  return { message: (error.message || 'Signup failed'), code: 'UNKNOWN_ERROR' };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    // Validate input
    const validation = validateInput(name, email, password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: 400 }
      );
    }

    // If a service role key is available, use the Admin REST endpoint to create
    // the user and mark the email as confirmed. This prevents Supabase from
    // sending a confirmation email (avoids hitting email rate limits).
    if (SERVICE_ROLE_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            apikey: SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: { name: name.trim() },
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error('Supabase admin create user failed', { status: res.status, body: json });

          // Handle already-existing email specifically
          if (json?.error_code === 'email_exists' || json?.code === 'email_exists' || res.status === 422) {
            return NextResponse.json(
              { error: 'Email already registered', code: 'EMAIL_ALREADY_EXISTS' },
              { status: 409 }
            );
          }

          const message = json?.message || json?.error || 'Failed to create user';
          const status = res.status || 400;
          return NextResponse.json(
            { error: message, code: json?.error_code || 'SIGNUP_ERROR' },
            { status }
          );
        }

        const userData = json.user || json;
        return NextResponse.json({
          user: userData,
          email: userData.email,
          message: 'Signup successful'
        }, { status: 201 });
      } catch (e) {
        console.error('Supabase admin request error', e);
        return NextResponse.json(
          { error: 'Failed to create account. Please try again', code: 'ADMIN_ERROR' },
          { status: 500 }
        );
      }
    }

    // Fallback: use client signUp (will send confirmation email)
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });

    if (error) {
      const { message, code } = mapSignupError(error);
      const status = code === 'EMAIL_ALREADY_EXISTS' ? 409 : 400;
      return NextResponse.json({ error: message, code }, { status });
    }

    return NextResponse.json({
      user: data.user ?? null,
      session: data.session ?? null,
      email: data.user?.email,
      message: 'Signup successful. Please check your email to confirm'
    }, { status: 201 });
  } catch (err) {
    console.error('Signup server error:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again later', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
