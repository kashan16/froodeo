import { getUserFromRequest } from '@/lib/auth';
import { getVerifiedOrderTokenFromRequest } from '@/lib/orderToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name, image_url))')
    .eq('id', id)
    .single();
  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const orderToken = getVerifiedOrderTokenFromRequest(request);
  const hasOrderToken = orderToken?.order_id === id;

  const user = getUserFromRequest(request);
  const isOwner = !!user && order.user_id === user.sub;

  if (!hasOrderToken && !isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ data: order });
}