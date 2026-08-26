import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 1. Read RAW body text first — do not parse yet
  const rawBody = await request.text();

  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // 2. HMAC the raw bytes, not a re-serialized object
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  // 3. Timing-safe comparison, same-length buffers only
  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const isValid =
    sigBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(sigBuf, expectedBuf);

  if (!isValid) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 4. Only now parse the JSON, after verification passed
  const body = JSON.parse(rawBody);
  const { event, payload } = body;

  try {
    if (event === 'payment.authorized' || event === 'payment.captured') {
      await handlePaymentSuccess(payload);
    } else if (event === 'payment.failed') {
      await handlePaymentFailure(payload);
    }
    return NextResponse.json({ acknowledged: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still ack 200 so Razorpay doesn't hammer retries for a bug on our end —
    // but this failure needs to be logged/alerted since it means money moved
    // and our DB didn't reflect it.
    return NextResponse.json({ acknowledged: true });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentSuccess(payload: any) {
  const { payment, order } = payload;
  const paymentId = payment.entity.id;
  const razorpayOrderId = order.entity.id;

  // Look up the payment by razorpay_order_id instead of parsing the receipt
  // string — receipt format can change, and order_id may itself contain
  // underscores. The payments table is the source of truth, and it already
  // stores order_id from when /api/payments/init created this row.
  const { data: existingPayment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (fetchError || !existingPayment) {
    console.error(`Payment record not found for razorpay_order_id: ${razorpayOrderId}`);
    return;
  }

  // Idempotency: if we've already captured this, don't redo the work
  if (existingPayment.status === 'captured') {
    console.log(`Payment already captured: ${existingPayment.id}`);
    return;
  }

  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      razorpay_payment_id: paymentId,
      status: 'captured',
      method: payment.entity.method,
    })
    .eq('id', existingPayment.id);

  if (updatePaymentError) {
    console.error('Failed to update payment:', updatePaymentError);
    return;
  }

  const { error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', existingPayment.order_id);

  if (updateOrderError) {
    console.error('Failed to update order:', updateOrderError);
  }

  // TODO: Send confirmation email to user
  console.log(`Payment successful for order: ${existingPayment.order_id}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailure(payload: any) {
  const { payment, order } = payload;
  const razorpayOrderId = order.entity.id;

  const { data: existingPayment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (fetchError || !existingPayment) {
    console.error(`Payment record not found for razorpay_order_id: ${razorpayOrderId}`);
    return;
  }

  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      razorpay_payment_id: payment.entity.id,
      status: 'failed',
    })
    .eq('id', existingPayment.id);

  if (updatePaymentError) {
    console.error('Failed to update payment:', updatePaymentError);
    return;
  }

  // Order stays pending so the user can retry
  console.log(`Payment failed for order: ${existingPayment.order_id}`);
}