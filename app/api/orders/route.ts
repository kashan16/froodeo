import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

interface OrderItemInput {
  product_id: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    customer_name,
    customer_phone,
    items,
    delivery_address,
    delivery_date,
    delivery_time,
  } = body as {
    customer_name: string;
    customer_phone: string;
    items: OrderItemInput[];
    delivery_address: string;
    delivery_date?: string;
    delivery_time?: string;
  };

  if (!customer_name?.trim() || !customer_phone?.trim()) {
    return NextResponse.json(
      { error: 'customer_name and customer_phone are required' },
      { status: 400 }
    );
  }
  if (!/^[6-9]\d{9}$/.test(customer_phone.trim())) {
    return NextResponse.json({ error: 'Invalid Indian phone number' }, { status: 400 });
  }
  if (!delivery_address?.trim()) {
    return NextResponse.json({ error: 'delivery_address is required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }

  // Price is looked up server-side from the DB — NEVER trust a client-sent
  // unit_price, or anyone can checkout a ₹500 biryani for ₹1.
  const productIds = items.map((i) => i.product_id);
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, price, is_available')
    .in('id', productIds);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productMap = new Map(products?.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItemsToInsert: {
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[] = [];

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      return NextResponse.json(
        { error: `Product not found: ${item.product_id}` },
        { status: 400 }
      );
    }
    if (!product.is_available) {
      return NextResponse.json(
        { error: `Product no longer available: ${item.product_id}` },
        { status: 400 }
      );
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const totalPrice = product.price * item.quantity;
    subtotal += totalPrice;
    orderItemsToInsert.push({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: product.price,
      total_price: totalPrice,
    });
  }

  const deliveryCharge = subtotal >= 500 ? 0 : 40; // adjust to your real rule
  const discount = 0; // wire up coupon logic here if/when you have it
  const total = subtotal + deliveryCharge - discount;

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: null, // guest checkout
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      status: 'pending',
      subtotal,
      delivery_charge: deliveryCharge,
      discount,
      total,
      delivery_address: delivery_address.trim(),
      delivery_date: delivery_date || null,
      delivery_time: delivery_time || null,
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message || 'Failed to create order' },
      { status: 500 }
    );
  }

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
    orderItemsToInsert.map((item) => ({ ...item, order_id: order.id }))
  );

  if (itemsError) {
    // Roll back the order so we don't leave an orphaned empty order
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: order }, { status: 201 });
}

export async function GET(request: NextRequest) {
  // Listing all orders needs admin auth, which doesn't exist yet.
  // Disabled rather than left open — a public order list would leak
  // every customer's name, phone, and address.
  return NextResponse.json({ error: 'Not available' }, { status: 405 });
}