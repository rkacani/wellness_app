import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required', code: 'MISSING_FIELDS' }, { status: 400 });
  }

  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration', code: 'SERVER_ERROR' }, { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: adminHeaders(),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 });
  }

  const user = await res.json();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name ?? '',
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { userId, name, email } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required', code: 'MISSING_FIELDS' }, { status: 400 });
  }

  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration', code: 'SERVER_ERROR' }, { status: 500 });
  }

  const payload: Record<string, unknown> = {};

  if (name !== undefined) {
    payload.user_metadata = { name: name.trim() };
  }

  if (email !== undefined) {
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address', code: 'INVALID_EMAIL' }, { status: 400 });
    }
    payload.email = email.toLowerCase().trim();
    payload.email_confirm = true;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update', code: 'NO_CHANGES' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.message || json?.error || 'Failed to update profile';
    return NextResponse.json({ error: message, code: 'UPDATE_FAILED' }, { status: res.status });
  }

  return NextResponse.json({
    id: json.id,
    email: json.email,
    name: json.user_metadata?.name ?? '',
  });
}
