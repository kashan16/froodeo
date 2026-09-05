import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('referral_code')
    .eq('id', user.sub)
    .single();

  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.sub)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    data: {
      referral_code: profile?.referral_code ?? null,
      referrals: referrals ?? [],
    },
  });
}