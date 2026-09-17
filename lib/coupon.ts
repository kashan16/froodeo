import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface CouponRow {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  usage_limit: number | null;
  usage_limit_per_user: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

interface ValidateCouponResult {
  valid: boolean;
  error?: string;
  coupon?: CouponRow;
  discountAmount?: number;
}

function computeDiscount(coupon: CouponRow, subtotal: number): number {
  let discount =
    coupon.discount_type === 'flat'
      ? coupon.discount_value
      : Math.round(subtotal * (coupon.discount_value / 100) * 100) / 100;

  if (coupon.discount_type === 'percentage' && coupon.max_discount_amount != null) {
    discount = Math.min(discount, coupon.max_discount_amount);
  }
  return Math.min(discount, subtotal);
}

// phone is now required for per-customer limit enforcement — guest
// checkouts never reliably have a user_id, but every order collects a
// phone number, so that's the identity the redemption cap is keyed to.
export async function validateCoupon(
  code: string,
  subtotal: number,
  userId: string | null,
  phone: string | null
): Promise<ValidateCouponResult> {
  const normalizedCode = code.trim().toUpperCase();

  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (error || !coupon) {
    return { valid: false, error: 'Invalid coupon code' };
  }
  if (!coupon.is_active) {
    return { valid: false, error: 'This coupon is no longer active' };
  }

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, error: 'This coupon is not active yet' };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, error: 'This coupon has expired' };
  }

  if (subtotal < coupon.min_order_value) {
    return {
      valid: false,
      error: `Minimum order value for this coupon is ₹${coupon.min_order_value}`,
    };
  }

  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, error: 'This coupon has reached its usage limit' };
  }

  // Per-customer limit — checked by phone (always present) and, if
  // available, by user_id too, so a logged-in user can't dodge the cap
  // by ordering from a different phone number attached to their account.
  if (phone || userId) {
    let query = supabaseAdmin
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id);

    if (phone && userId) {
      query = query.or(`customer_phone.eq.${phone},user_id.eq.${userId}`);
    } else if (phone) {
      query = query.eq('customer_phone', phone);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { count, error: countError } = await query;
    if (countError) {
      return { valid: false, error: 'Failed to validate coupon usage' };
    }
    if ((count ?? 0) >= coupon.usage_limit_per_user) {
      return { valid: false, error: 'You have already used this coupon' };
    }
  }

  const discountAmount = computeDiscount(coupon, subtotal);
  return { valid: true, coupon, discountAmount };
}

export async function recordCouponRedemption(
  couponId: string,
  userId: string | null,
  phone: string | null,
  orderId: string,
  discountAmount: number
) {
  await supabaseAdmin.from('coupon_redemptions').insert({
    coupon_id: couponId,
    user_id: userId,
    customer_phone: phone,
    order_id: orderId,
    discount_amount: discountAmount,
  });

  // used_count needs an atomic increment, not a read-then-write, or two
  // concurrent redemptions can both read the same stale value.
  await supabaseAdmin.rpc('increment_coupon_used_count', { coupon_id_input: couponId });
}