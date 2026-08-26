import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRazorpayOrder } from '@/lib/razorpay';
import {
  generateIdempotencyKey,
  getIdempotencyResponse,
  setIdempotencyResponse,
} from '@/lib/idempotency';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { order_id, user_id } = body;

  if (!order_id || !user_id) {
    return NextResponse.json(
      { error: 'order_id and user_id are required' },
      { status: 400 }
    );
  }

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(order_id, user_id);

  // Check if this payment initialization already exists
  const existingResponse = getIdempotencyResponse(idempotencyKey);
  if (existingResponse) {
    return NextResponse.json(existingResponse);
  }

  // Fetch order details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .eq('user_id', user_id)
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
    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(
      order.total,
      `order_${order_id}_${Date.now()}`
    );

    // Store Razorpay order ID in database for webhook verification
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

    const response = {
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: order.total * 100,
      orderId: order_id,
      paymentId: payment.id,
      userId: user_id,
    };

    // Store in idempotency store
    setIdempotencyResponse(idempotencyKey, response);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}