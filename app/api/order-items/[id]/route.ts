import { canAccessOrder } from '@/lib/orderAccess';
import { recalculateOrderTotals } from '@/lib/orderTotals';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const { data: existingItem } = await supabaseAdmin
    .from('order_items')
    .select('order_id, product_id')
    .eq('id', id)
    .single();
  if (!existingItem) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

  if (!(await canAccessOrder(request, existingItem.order_id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', existingItem.order_id)
    .single();
  if (!order || order.status !== 'pending') {
    return NextResponse.json({ error: 'Order can no longer be modified' }, { status: 400 });
  }

  const { quantity, options } = await request.json();
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'A positive integer quantity is required' }, { status: 400 });
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('price')
    .eq('id', existingItem.product_id)
    .single();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .update({ quantity, options, unit_price: product.price, total_price: product.price * quantity })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recalculateOrderTotals(existingItem.order_id);
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const { data: existingItem } = await supabaseAdmin.from('order_items').select('order_id').eq('id', id).single();
  if (!existingItem) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

  if (!(await canAccessOrder(request, existingItem.order_id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', existingItem.order_id)
    .single();
  if (!order || order.status !== 'pending') {
    return NextResponse.json({ error: 'Order can no longer be modified' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('order_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recalculateOrderTotals(existingItem.order_id);
  return NextResponse.json({ message: 'Order item deleted' });
}