import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/users
export async function GET(request: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/users (create profile row after auth signup)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, name, phone } = body;

  if (!id) {
    return NextResponse.json({ error: 'id (auth user id) is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ id, name, phone })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}