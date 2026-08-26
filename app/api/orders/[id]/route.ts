import { getVerifiedOrderTokenFromRequest } from '@/lib/orderToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const tokenPayload = getVerifiedOrderTokenFromRequest(request);
  if (!tokenPayload || tokenPayload.order_id !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name, image_url))')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ data: order });
}