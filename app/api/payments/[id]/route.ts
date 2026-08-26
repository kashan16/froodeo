import { getVerifiedOrderTokenFromRequest } from '@/lib/orderToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

type Params = Promise<{ id: string }>;

// GET /api/payments/[id] — fetch a single payment by its own id,
// scoped to the caller's token.
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;

  const tokenPayload = getVerifiedOrderTokenFromRequest(request);
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.order_id !== tokenPayload.order_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: payment });
}