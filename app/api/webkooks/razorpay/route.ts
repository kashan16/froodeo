import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Razorpay webhook handler
 * Verify signature, update payment status, and update order status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payload } = body;

    // Verify webhook signature
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify against Razorpay webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const crypto = require('crypto');
    const hmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hmac !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Handle payment events
    if (event === 'payment.authorized' || event === 'payment.captured') {
      await handlePaymentSuccess(payload);
    } else if (event === 'payment.failed') {
      await handlePaymentFailure(payload);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ acknowledged: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Return 200 even on error to prevent Razorpay from retrying
    return NextResponse.json({ acknowledged: true });
  }
}

async function handlePaymentSuccess(payload: any) {
  const { payment, order } = payload;
  const paymentId = payment.id;
  const orderId = order.receipt.split('_')[1]; // Assuming receipt format: order_ORDER_ID_TIMESTAMP

  // Fetch existing payment record
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', order.id)
    .single();

  if (!existingPayment) {
    console.warn(`Payment record not found for order: ${order.id}`);
    return;
  }

  // Check if already processed (idempotency)
  if (existingPayment.status === 'captured') {
    console.log(`Payment already captured for order: ${orderId}`);
    return;
  }

  // Update payment with all details
  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      razorpay_payment_id: paymentId,
      razorpay_signature: payment.vpa || payment.email, // Store identifier
      status: 'captured',
      method: payment.method,
    })
    .eq('id', existingPayment.id);

  if (updatePaymentError) {
    console.error('Failed to update payment:', updatePaymentError);
    return;
  }

  // Update order status to confirmed
  const { error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'confirmed',
      razorpay_order_id: order.id,
    })
    .eq('id', orderId);

  if (updateOrderError) {
    console.error('Failed to update order:', updateOrderError);
  }

  // TODO: Send confirmation email to user
  console.log(`Payment successful for order: ${orderId}`);
}

async function handlePaymentFailure(payload: any) {
  const { payment, order } = payload;
  const orderId = order.receipt.split('_')[1];

  // Fetch existing payment record
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', order.id)
    .single();

  if (!existingPayment) {
    console.warn(`Payment record not found for order: ${order.id}`);
    return;
  }

  // Update payment status to failed
  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      razorpay_payment_id: payment.id,
      status: 'failed',
    })
    .eq('id', existingPayment.id);

  if (updatePaymentError) {
    console.error('Failed to update payment:', updatePaymentError);
    return;
  }

  // Keep order in pending status (user can retry)
  console.log(`Payment failed for order: ${orderId}`);
}