import { supabaseAdmin } from './supabaseAdmin';

const REFERRAL_REWARD_POINTS = 50;

// Call once, right after a user's FIRST confirmed order — referrals
// reward genuine new customers, not just signups.
export async function completeReferralIfEligible(userId: string): Promise<void> {
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('*')
    .eq('referred_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!referral) return;

  // Only complete on the referred user's first order ever.
  const { count: priorOrders } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'confirmed');

  if ((priorOrders ?? 0) > 1) return; // this isn't their first confirmed order

  await supabaseAdmin
    .from('referrals')
    .update({ status: 'completed', completed_at: new Date().toISOString(), reward_points: REFERRAL_REWARD_POINTS })
    .eq('id', referral.id);

  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('loyalty_points_balance')
    .eq('id', referral.referrer_id)
    .single();

  const newBalance = (referrer?.loyalty_points_balance ?? 0) + REFERRAL_REWARD_POINTS;
  await supabaseAdmin.from('users').update({ loyalty_points_balance: newBalance }).eq('id', referral.referrer_id);

  await supabaseAdmin.from('loyalty_transactions').insert({
    user_id: referral.referrer_id,
    order_id: null,
    type: 'earn',
    points: REFERRAL_REWARD_POINTS,
    balance_after: newBalance,
    note: `Referral reward for ${referral.referred_id}`,
  });
}

// Called at account creation (inside your OTP verify route, whenever
// that gets built) — links a new user to whoever referred them.
export async function linkReferral(newUserId: string, referralCode: string): Promise<void> {
  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('referral_code', referralCode.trim())
    .maybeSingle();

  if (!referrer || referrer.id === newUserId) return; // invalid or self-referral

  await supabaseAdmin.from('users').update({ referred_by: referrer.id }).eq('id', newUserId);
  await supabaseAdmin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    referral_code: referralCode.trim(),
    status: 'pending',
  });
}