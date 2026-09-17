import { getUserFromRequest } from '@/lib/auth';
import { recordCouponRedemption, validateCoupon } from '@/lib/coupon';
import { computeDeliveryCharge, computeTax, getDeliverySettings, getEarliestDeliveryDate } from '@/lib/deliverySettings';
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
    need_invoice,
    gst_number,
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
    need_invoice?: boolean;
    gst_number?: string;
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

  // Double-submit guard
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotency_key)
    .maybeSingle();

  if (existingOrder) {
    const orderToken = signOrderToken({ order_id: existingOrder.id, guest_id: crypto.randomUUID() });
    return NextResponse.json({ data: existingOrder, orderToken }, { status: 200 });
  }

  if (!delivery_pincode) {
    return NextResponse.json({ error: 'delivery_pincode is required' }, { status: 400 });
  }
  const { serviceable } = await isPincodeServiceable(delivery_pincode);
  if (!serviceable) {
    return NextResponse.json({ error: "Sorry, we don't deliver to this pincode yet" }, { status: 400 });
  }

  const settings = await getDeliverySettings();

  // #3 — Pre-booking: force delivery date to the earliest allowed date
  // (today + min_lead_days). Never trust a client-supplied date for this.
  const earliestDate = getEarliestDeliveryDate(settings);
  const finalDeliveryDate =
    !delivery_date || delivery_date < earliestDate ? earliestDate : delivery_date;

  const method: 'online' | 'cod' = payment_method === 'cod' ? 'cod' : 'online';
  const normalizedPhone = customer_phone.trim();

  const productIds = items.map((i) => i.product_id);
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, price, is_available, stock_quantity')
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
    // #7 — Quantity limits. stock_quantity === null means unlimited.
    if (product.stock_quantity !== null && item.quantity > product.stock_quantity) {
      return NextResponse.json(
        {
          error:
            product.stock_quantity === 0
              ? `Out of stock: ${item.product_id}`
              : `Only ${product.stock_quantity} left in stock for this item`,
        },
        { status: 400 }
      );
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

  // #4 — Delivery fee now driven by admin settings, not hardcoded.
  const deliveryCharge = computeDeliveryCharge(subtotal, settings);
  const discount = 0;

  const callerUser = getUserFromRequest(request);

  // Coupon redemption limits are enforced per phone number (guest
  // checkouts rarely have a user_id) — pass it through so validateCoupon
  // can check "has this number already used this coupon".
  let couponDiscount = 0;
  let appliedCouponId: string | null = null;
  if (coupon_code?.trim()) {
    const result = await validateCoupon(coupon_code, subtotal, callerUser?.sub ?? null, normalizedPhone);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    couponDiscount = result.discountAmount!;
    appliedCouponId = result.coupon!.id;
  }

  // #5 — tax charged on (subtotal - coupon discount), before delivery fee.
  const taxableAmount = Math.max(0, subtotal - couponDiscount);
  const taxAmount = computeTax(taxableAmount, settings);

  const total = subtotal + deliveryCharge + taxAmount - discount - couponDiscount;
  const initialStatus = method === 'cod' ? 'confirmed' : 'pending';

  let invoiceNumber: string | null = null;
  if (need_invoice) {
    const { data: seqVal, error: seqError } = await supabaseAdmin.rpc('nextval', { seq: 'invoice_number_seq' });
    if (seqError) {
      return NextResponse.json({ error: `Failed to generate invoice number: ${seqError.message}` }, { status: 500 });
    }
    invoiceNumber = `INV-${new Date().getFullYear()}-${seqVal}`;
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: callerUser?.sub ?? null,
      customer_name: customer_name.trim(),
      customer_phone: normalizedPhone,
      status: initialStatus,
      payment_method: method,
      subtotal,
      delivery_charge: deliveryCharge,
      tax_amount: taxAmount,
      discount,
      coupon_id: appliedCouponId,
      coupon_discount: couponDiscount,
      total,
      delivery_address: delivery_address.trim(),
      delivery_date: finalDeliveryDate,
      delivery_time: delivery_time || null,
      idempotency_key: idempotency_key.trim(),
      invoice_number: invoiceNumber,
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

  // #7 — Decrement stock for items with a limited quantity.
  for (const item of orderItemsToInsert) {
    const product = productMap.get(item.product_id);
    if (product && product.stock_quantity !== null) {
      await supabaseAdmin
        .from('products')
        .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
        .eq('id', item.product_id);
    }
  }

  if (appliedCouponId) {
    await recordCouponRedemption(appliedCouponId, callerUser?.sub ?? null, normalizedPhone, order.id, couponDiscount);
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