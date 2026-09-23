import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { recordCouponRedemption, validateCoupon } from '@/lib/coupon';

function queueFrom(result: { data: unknown; error: unknown; count?: number | null }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}
function queueRpc(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.rpc.mockResolvedValueOnce(result);
}

const baseCoupon = {
  id: 'coupon-1',
  code: 'SAVE10',
  discount_type: 'flat' as const,
  discount_value: 10,
  max_discount_amount: null,
  min_order_value: 0,
  usage_limit: null,
  usage_limit_per_user: 1,
  used_count: 0,
  valid_from: '2020-01-01T00:00:00.000Z',
  valid_until: null,
  is_active: true,
};

beforeEach(() => vi.clearAllMocks());

describe('validateCoupon', () => {
  it('rejects an unknown code', async () => {
    queueFrom({ data: null, error: { message: 'not found' } });

    const result = await validateCoupon('NOPE', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'Invalid coupon code' });
  });

  it('normalizes the code to uppercase and trimmed before lookup', async () => {
    queueFrom({ data: null, error: { message: 'nf' } });

    await validateCoupon('  save10  ', 100, null, '9876543210');

    const chain = supabaseAdminMock.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith('code', 'SAVE10');
  });

  it('rejects an inactive coupon', async () => {
    queueFrom({ data: { ...baseCoupon, is_active: false }, error: null });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'This coupon is no longer active' });
  });

  it('rejects a coupon that is not active yet', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    queueFrom({ data: { ...baseCoupon, valid_from: future }, error: null });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'This coupon is not active yet' });
  });

  it('rejects an expired coupon', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    queueFrom({ data: { ...baseCoupon, valid_until: past }, error: null });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'This coupon has expired' });
  });

  it('rejects when subtotal is below min_order_value', async () => {
    queueFrom({ data: { ...baseCoupon, min_order_value: 500 }, error: null });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'Minimum order value for this coupon is ₹500' });
  });

  it('rejects when the global usage_limit is reached', async () => {
    queueFrom({ data: { ...baseCoupon, usage_limit: 5, used_count: 5 }, error: null });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'This coupon has reached its usage limit' });
  });

  it('rejects when the phone has already used the coupon up to its per-user limit', async () => {
    queueFrom({ data: baseCoupon, error: null });
    queueFrom({ data: null, error: null, count: 1 });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'You have already used this coupon' });
  });

  it('returns a validation error if the redemption count query itself errors', async () => {
    queueFrom({ data: baseCoupon, error: null });
    queueFrom({ data: null, error: { message: 'db error' }, count: null });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result).toEqual({ valid: false, error: 'Failed to validate coupon usage' });
  });

  it('computes a flat discount and validates successfully', async () => {
    queueFrom({ data: baseCoupon, error: null });
    queueFrom({ data: null, error: null, count: 0 });

    const result = await validateCoupon('SAVE10', 100, null, '9876543210');

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(10);
    expect(result.coupon).toEqual(baseCoupon);
  });

  it('computes a percentage discount', async () => {
    const pctCoupon = { ...baseCoupon, discount_type: 'percentage' as const, discount_value: 20 };
    queueFrom({ data: pctCoupon, error: null });
    queueFrom({ data: null, error: null, count: 0 });

    const result = await validateCoupon('SAVE10', 200, null, '9876543210');

    expect(result.discountAmount).toBe(40);
  });

  it('caps a percentage discount at max_discount_amount', async () => {
    const pctCoupon = {
      ...baseCoupon,
      discount_type: 'percentage' as const,
      discount_value: 50,
      max_discount_amount: 30,
    };
    queueFrom({ data: pctCoupon, error: null });
    queueFrom({ data: null, error: null, count: 0 });

    const result = await validateCoupon('SAVE10', 200, null, '9876543210');

    expect(result.discountAmount).toBe(30);
  });

  it('never returns a discount larger than the subtotal itself', async () => {
    const bigFlat = { ...baseCoupon, discount_value: 1000 };
    queueFrom({ data: bigFlat, error: null });
    queueFrom({ data: null, error: null, count: 0 });

    const result = await validateCoupon('SAVE10', 50, null, '9876543210');

    expect(result.discountAmount).toBe(50);
  });

  it('skips the per-user check entirely when neither phone nor userId is provided', async () => {
    queueFrom({ data: baseCoupon, error: null });

    const result = await validateCoupon('SAVE10', 100, null, null);

    expect(result.valid).toBe(true);
    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });
});

describe('recordCouponRedemption', () => {
  it('inserts a redemption row and increments used_count atomically', async () => {
    queueFrom({ data: null, error: null });
    queueRpc({ data: null, error: null });

    await recordCouponRedemption('coupon-1', 'user-1', '9876543210', 'order-1', 10);

    const insertChain = supabaseAdminMock.from.mock.results[0].value;
    expect(insertChain.insert).toHaveBeenCalledWith({
      coupon_id: 'coupon-1',
      user_id: 'user-1',
      customer_phone: '9876543210',
      order_id: 'order-1',
      discount_amount: 10,
    });
    expect(supabaseAdminMock.rpc).toHaveBeenCalledWith('increment_coupon_used_count', {
      coupon_id_input: 'coupon-1',
    });
  });
});