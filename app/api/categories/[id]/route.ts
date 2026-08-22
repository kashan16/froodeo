import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Params = Promise<{ id: string }>;

// GET /api/categories/:id
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ data });
}

// PUT /api/categories/:id
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// DELETE /api/categories/:id
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: 'Category deleted' });
}