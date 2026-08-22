import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/payments?order_id=
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id');

  let query = supabaseAdmin.from('payments').select('*');
  if (orderId) query = query.eq('order_id', orderId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/payments (create a payment record, typically after Razorpay order creation)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { order_id, razorpay_order_id, amount, currency = 'INR', status = 'created' } = body;

  if (!order_id || !razorpay_order_id || amount === undefined) {
    return NextResponse.json(
      { error: 'order_id, razorpay_order_id, and amount are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert({ order_id, razorpay_order_id, amount, currency, status })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}