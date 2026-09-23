import { canAccessOrder } from '@/lib/orderAccess';
import { recalculateOrderTotals } from '@/lib/orderTotals';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  if (!(await canAccessOrder(request, id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select('*, products(id, name, image_url)')
    .eq('order_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  if (!(await canAccessOrder(request, id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: order } = await supabaseAdmin.from('orders').select('status').eq('id', id).single();
  if (!order || order.status !== 'pending') {
    return NextResponse.json({ error: 'Order can no longer be modified' }, { status: 400 });
  }

  const { product_id, quantity, options } = await request.json();
  if (!product_id || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'product_id and a positive integer quantity are required' }, { status: 400 });
  }

  // Price is looked up server-side — never trust a client-sent unit_price.
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('price, is_available, stock_quantity')
    .eq('id', product_id)
    .single();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 });
  if (!product.is_available) return NextResponse.json({ error: 'Product no longer available' }, { status: 400 });

  // #7 — same stock-limit enforcement as order creation. If this item
  // already exists on the order, its previously-reserved quantity was
  // never re-added back to stock_quantity (stock is decremented once
  // at order-creation time, not per line-item edit), so a fresh add
  // here is checked against current stock as-is — this route is for
  // adding a *new* line item, not adjusting an existing one's quantity
  // (that's PUT /api/order-items/:id).
  if (product.stock_quantity !== null && quantity > product.stock_quantity) {
    return NextResponse.json(
      {
        error:
          product.stock_quantity === 0
            ? 'Out of stock'
            : `Only ${product.stock_quantity} left in stock for this item`,
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .insert({
      order_id: id,
      product_id,
      quantity,
      unit_price: product.price,
      total_price: product.price * quantity,
      options,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // #7 — decrement stock for the newly added item, mirroring the
  // decrement done at order-creation time so stock stays accurate
  // when items are added post-creation (before payment/confirmation).
  if (product.stock_quantity !== null) {
    await supabaseAdmin
      .from('products')
      .update({ stock_quantity: Math.max(0, product.stock_quantity - quantity) })
      .eq('id', product_id);
  }

  await recalculateOrderTotals(id);
  return NextResponse.json({ data }, { status: 201 });
}