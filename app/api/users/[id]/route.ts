// app/api/users/[id]/route.ts
import { getAdminFromRequest, getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const user = getUserFromRequest(request);
  const admin = getAdminFromRequest(request);
  if (!admin && user?.sub !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const user = getUserFromRequest(request);
  if (!user || user.sub !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // phone is intentionally not editable here — it's the OTP-verified
  // identity. Add a dedicated "change phone" flow with its own OTP step
  // later if you need one.
  const { name } = await request.json();
  const { data, error } = await supabaseAdmin.from('users').update({ name }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'User deleted' });
}