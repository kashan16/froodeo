import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { recalculateOrderTotals } from '@/lib/orderTotals';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('recalculateOrderTotals', () => {
  it('recomputes subtotal from items and total including all adjustments', async () => {
    queueFrom({ data: [{ total_price: 100 }, { total_price: 50 }], error: null });
    queueFrom({
      data: { delivery_charge: 40, discount: 10, coupon_discount: 5, points_discount: 0 },
      error: null,
    });
    queueFrom({ data: null, error: null });

    await recalculateOrderTotals('order-1');

    const updateChain = supabaseAdminMock.from.mock.results[2].value;
    expect(updateChain.update).toHaveBeenCalledWith({ subtotal: 150, total: 175 });
  });

  it('treats no items as a zero subtotal', async () => {
    queueFrom({ data: null, error: null });
    queueFrom({
      data: { delivery_charge: 0, discount: 0, coupon_discount: 0, points_discount: 0 },
      error: null,
    });
    queueFrom({ data: null, error: null });

    await recalculateOrderTotals('order-1');

    const updateChain = supabaseAdminMock.from.mock.results[2].value;
    expect(updateChain.update).toHaveBeenCalledWith({ subtotal: 0, total: 0 });
  });

  it('does nothing further if the order itself is not found', async () => {
    queueFrom({ data: [{ total_price: 100 }], error: null });
    queueFrom({ data: null, error: { message: 'nf' } });

    await recalculateOrderTotals('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(2);
  });
});