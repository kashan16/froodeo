import { getVerifiedOrderTokenFromRequest } from '@/lib/orderToken';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const body = await request.json();
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  // Require a valid token before doing anything else
  const tokenPayload = getVerifiedOrderTokenFromRequest(request);
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 401 });
    }

    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // The core ownership check: does this caller's token actually match
    // the order this payment belongs to? Without this, anyone with ANY
    // valid token could verify ANY payment by id.
    if (payment.order_id !== tokenPayload.order_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payment.status === 'captured') {
      return NextResponse.json({ data: payment, message: 'Payment already verified' });
    }

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'captured',
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', payment.order_id);

    return NextResponse.json({ data: updatedPayment });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}