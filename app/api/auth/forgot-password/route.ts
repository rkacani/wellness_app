import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'http://localhost:3000';

    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error('Reset password error:', error);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Password reset email sent' }, { status: 200 });
  } catch (err) {
    console.error('Forgot password server error:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again later', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
