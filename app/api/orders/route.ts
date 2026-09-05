import { getUserFromRequest } from '@/lib/auth';
import { recordCouponRedemption, validateCoupon } from '@/lib/coupon';
import { awardLoyaltyPoints } from '@/lib/loyalty';
import { signOrderToken } from '@/lib/orderToken';
import { completeReferralIfEligible } from '@/lib/referrel';
import { isPincodeServiceable } from '@/lib/serviceablePincode';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
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
    delivery_pincode,
    delivery_date,
    delivery_time,
    payment_method,
    coupon_code,
    idempotency_key,
  } = body as {
    customer_name: string;
    customer_phone: string;
    items: OrderItemInput[];
    delivery_address: string;
    delivery_pincode: string;
    delivery_date?: string;
    delivery_time?: string;
    payment_method?: 'online' | 'cod';
    coupon_code?: string;
    idempotency_key: string;
  };

  if (!customer_name?.trim() || !customer_phone?.trim()) {
    return NextResponse.json({ error: 'customer_name and customer_phone are required' }, { status: 400 });
  }
  if (!/^[6-9]\d{9}$/.test(customer_phone.trim())) {
    return NextResponse.json({ error: 'Invalid Indian phone number' }, { status: 400 });
  }
  if (!delivery_address?.trim()) {
    return NextResponse.json({ error: 'delivery_address is required' }, { status: 400 });
  }
  if (!idempotency_key?.trim()) {
    return NextResponse.json({ error: 'idempotency_key is required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }

  // Double-submit guard: if this exact client-generated key already
  // produced an order, return that order instead of creating a duplicate.
  // Client generates one key per checkout attempt and reuses it on retry.
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotency_key)
    .maybeSingle();

  if (existingOrder) {
    const orderToken = signOrderToken({ order_id: existingOrder.id, guest_id: crypto.randomUUID() });
    return NextResponse.json({ data: existingOrder, orderToken }, { status: 200 });
  }

  // Server-side pincode enforcement — the product-page gate is UX only.
  if (delivery_pincode) {
    const { serviceable } = await isPincodeServiceable(delivery_pincode);
    if (!serviceable) {
      return NextResponse.json(
        { error: "Sorry, we don't deliver to this pincode yet" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: 'delivery_pincode is required' }, { status: 400 });
  }

  const method: 'online' | 'cod' = payment_method === 'cod' ? 'cod' : 'online';

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
      return NextResponse.json({ error: `Product not found: ${item.product_id}` }, { status: 400 });
    }
    if (!product.is_available) {
      return NextResponse.json({ error: `Product no longer available: ${item.product_id}` }, { status: 400 });
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

  const deliveryCharge = subtotal >= 500 ? 0 : 40;
  const discount = 0;

  const callerUser = getUserFromRequest(request);

  // Coupon is re-validated here — never trust a discount amount computed
  // client-side, even one that came from the earlier /validate preview
  // call, since state can drift between preview and submission.
  let couponDiscount = 0;
  let appliedCouponId: string | null = null;
  if (coupon_code?.trim()) {
    const result = await validateCoupon(coupon_code, subtotal, callerUser?.sub ?? null);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    couponDiscount = result.discountAmount!;
    appliedCouponId = result.coupon!.id;
  }

  const total = subtotal + deliveryCharge - discount - couponDiscount;
  const initialStatus = method === 'cod' ? 'confirmed' : 'pending';

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: callerUser?.sub ?? null,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      status: initialStatus,
      payment_method: method,
      subtotal,
      delivery_charge: deliveryCharge,
      discount,
      coupon_id: appliedCouponId,
      coupon_discount: couponDiscount,
      total,
      delivery_address: delivery_address.trim(),
      delivery_date: delivery_date || null,
      delivery_time: delivery_time || null,
      idempotency_key: idempotency_key.trim(),
    })
    .select()
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message || 'Failed to create order' }, { status: 500 });
  }

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItemsToInsert.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  if (appliedCouponId) {
    await recordCouponRedemption(appliedCouponId, callerUser?.sub ?? null, order.id, couponDiscount);
  }

  if (method === 'cod') {
    await awardLoyaltyPoints(order.id);
  }

  if (method === 'cod' && callerUser?.sub) {
    await completeReferralIfEligible(callerUser.sub);
  }

  const orderToken = signOrderToken({ order_id: order.id, guest_id: crypto.randomUUID() });

  return NextResponse.json({ data: order, orderToken }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ error: 'Not available' }, { status: 405 });
}