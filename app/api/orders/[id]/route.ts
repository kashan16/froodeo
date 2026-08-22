import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Params = Promise<{ id: string }>;

// GET /api/orders/:id
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(id, name, image_url)), payments(*)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ data });
}

// PUT /api/orders/:id (e.g. update status, delivery info)
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await request.json();

  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// DELETE /api/orders/:id
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: 'Order deleted' });
}