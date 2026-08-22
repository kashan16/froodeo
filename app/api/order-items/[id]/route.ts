import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Params = Promise<{ id: string }>;

// PUT /api/order-items/:id
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await request.json();
  const { quantity, unit_price, options } = body;

  const updates: Record<string, any> = { ...body };
  if (quantity !== undefined && unit_price !== undefined) {
    updates.total_price = quantity * unit_price;
  }

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// DELETE /api/order-items/:id
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('order_items')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: 'Order item deleted' });
}