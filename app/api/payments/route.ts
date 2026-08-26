import { getVerifiedOrderTokenFromRequest } from '@/lib/orderToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/payments — now REQUIRES a valid order token, and always
// scopes results to that token's order_id. The order_id query param,
// if present, must match the token — it can no longer be used to
// browse other orders' payments.
export async function GET(request: NextRequest) {
  const tokenPayload = getVerifiedOrderTokenFromRequest(request);
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('order_id', tokenPayload.order_id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST /api/payments has been removed. Payment records must only be
// created through /api/payments/init, which controls amount/status
// server-side. A public "create with arbitrary status" endpoint let
// anyone insert a fake 'captured' payment — there is no safe way to
// expose this route to unauthenticated clients.
export async function POST() {
  return NextResponse.json(
    { error: 'Not supported. Use /api/payments/init.' },
    { status: 405 }
  );
}