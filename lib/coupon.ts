import { supabaseAdmin } from './supabaseAdmin';

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: {
    id: string;
    code: string;
    discount_type: 'flat' | 'percentage';
    discount_value: number;
    max_discount_amount: number | null;
  };
  discountAmount?: number;
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId: string | null
): Promise<CouponValidationResult> {
  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .ilike('code', code.trim())
    .eq('is_active', true)
    .maybeSingle();

  if (!coupon) return { valid: false, error: 'Invalid coupon code' };

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
      error: `Minimum order value ₹${coupon.min_order_value} required for this coupon`,
    };
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, error: 'This coupon has reached its usage limit' };
  }

  // Per-user limit only enforceable for logged-in users — guests have no
  // stable identity to check redemption history against, so this check
  // is skipped for guest checkout (accepted trade-off of the guest model).
  if (userId) {
    const { count } = await supabaseAdmin
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);

    if ((count ?? 0) >= coupon.usage_limit_per_user) {
      return { valid: false, error: "You've already used this coupon" };
    }
  }

  let discountAmount =
    coupon.discount_type === 'flat'
      ? coupon.discount_value
      : (subtotal * coupon.discount_value) / 100;

  if (coupon.max_discount_amount !== null) {
    discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
  }
  discountAmount = Math.min(discountAmount, subtotal); // never discount below zero

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_amount: coupon.max_discount_amount,
    },
    discountAmount: Math.round(discountAmount * 100) / 100,
  };
}

// Records the redemption and increments used_count. Only called once an
export async function recordCouponRedemption(
  couponId: string,
  userId: string | null,
  orderId: string,
  discountAmount: number
): Promise<void> {
  if (userId) {
    await supabaseAdmin.from('coupon_redemptions').insert({
      coupon_id: couponId,
      user_id: userId,
      order_id: orderId,
      discount_amount: discountAmount,
    });
  }

  // used_count is tracked regardless of login state — guests still count
  // against the coupon's total usage_limit, just not usage_limit_per_user.
  const { error: rpcError } = await supabaseAdmin.rpc('increment_coupon_used_count', {
    coupon_id_input: couponId,
  });

  if (rpcError) {
    // Fallback if the RPC doesn't exist yet (e.g. migration not run).
    // Not atomic — acceptable stopgap, but run the migration below and
    // this branch stops being hit.
    const { data: current } = await supabaseAdmin
      .from('coupons')
      .select('used_count')
      .eq('id', couponId)
      .single();
    if (current) {
      await supabaseAdmin
        .from('coupons')
        .update({ used_count: current.used_count + 1 })
        .eq('id', couponId);
    }
  }
}