import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/orders?user_id=&status=
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const status = searchParams.get('status');

  let query = supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(id, name, image_url))');

  if (userId) query = query.eq('user_id', userId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/orders (creates order + order_items together)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    user_id,
    items, // [{ product_id, quantity, unit_price, options }]
    delivery_address,
    delivery_date,
    delivery_time,
    discount = 0,
    delivery_charge = 0,
  } = body;

  if (!user_id || !items?.length || !delivery_address) {
    return NextResponse.json(
      { error: 'user_id, items, and delivery_address are required' },
      { status: 400 }
    );
  }

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity,
    0
  );
  const total = subtotal + delivery_charge - discount;

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id,
      subtotal,
      delivery_charge,
      discount,
      total,
      delivery_address,
      delivery_date,
      delivery_time,
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    options: item.options ?? null,
  }));

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems)
    .select();

  if (itemsError) {
    // rollback the order if items fail
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...order, order_items: insertedItems } }, { status: 201 });
}