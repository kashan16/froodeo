import { getExistingPayment } from '@/lib/idempotency';
import { getVerifiedOrderTokenFromRequest, signOrderToken } from '@/lib/orderToken';
import { createRazorpayOrder } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { order_id } = body;

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  const existingToken = getVerifiedOrderTokenFromRequest(request);
  const guestId =
    existingToken && existingToken.order_id === order_id
      ? existingToken.guest_id
      : crypto.randomUUID();

  // Idempotency: reuse an existing non-failed payment attempt instead of
  // creating a duplicate Razorpay order for the same order_id.
  const existingPayment = await getExistingPayment(order_id);
  if (existingPayment) {
    const orderToken = signOrderToken({ order_id, guest_id: guestId });
    return NextResponse.json({
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      razorpayOrderId: existingPayment.razorpay_order_id,
      amount: existingPayment.amount,
      orderId: order_id,
      paymentId: existingPayment.id,
      orderToken,
    });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: 'Order is not in pending status' },
      { status: 400 }
    );
  }

  try {
    const razorpayOrder = await createRazorpayOrder(
      order.total,
      `order_${order_id}_${Date.now()}`
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id,
        razorpay_order_id: razorpayOrder.id,
        amount: order.total * 100,
        currency: 'INR',
        status: 'created',
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const orderToken = signOrderToken({ order_id, guest_id: guestId });

    return NextResponse.json({
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: order.total * 100,
      orderId: order_id,
      paymentId: payment.id,
      orderToken,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}