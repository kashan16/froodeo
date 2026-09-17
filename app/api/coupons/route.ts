import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

// GET /api/coupons — public, read-only list of coupons a customer can
// currently browse and apply. Deliberately excludes used_count,
// usage_limit_per_user, valid_from and internal ids beyond what the
// checkout modal needs to display and apply a code.
export async function GET() {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('code, discount_type, discount_value, max_discount_amount, min_order_value, valid_until, usage_limit, used_count')
    .eq('is_active', true)
    .lte('valid_from', nowIso)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Drop coupons that already hit their global usage cap — nothing left
  // to browse there, and used_count/usage_limit aren't otherwise needed
  // by the client so strip them from the response.
  const available = (data ?? [])
    .filter((c) => c.usage_limit == null || c.used_count < c.usage_limit)
    .map(({ used_count, usage_limit, ...rest }) => rest);

  return NextResponse.json({ data: available });
}