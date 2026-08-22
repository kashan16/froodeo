import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Params = Promise<{ id: string }>;

// GET /api/orders/:id/items
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select('*, products(id, name, image_url)')
    .eq('order_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/orders/:id/items (add an item to an existing order)
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await request.json();
  const { product_id, quantity, unit_price, options } = body;

  if (!product_id || !quantity || unit_price === undefined) {
    return NextResponse.json(
      { error: 'product_id, quantity, and unit_price are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .insert({
      order_id: id,
      product_id,
      quantity,
      unit_price,
      total_price: unit_price * quantity,
      options,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}