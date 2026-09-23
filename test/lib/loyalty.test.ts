import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { awardLoyaltyPoints } from '@/lib/loyalty';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('awardLoyaltyPoints', () => {
  it('does nothing for a guest order (no user_id)', async () => {
    queueFrom({ data: { id: 'order-1', user_id: null, points_earned: 0 }, error: null });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });

  it('does nothing if points were already awarded', async () => {
    queueFrom({ data: { id: 'order-1', user_id: 'user-1', points_earned: 50 }, error: null });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the order is not found', async () => {
    queueFrom({ data: null, error: { message: 'nf' } });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });

  it('stops after fetching items if none exist', async () => {
    queueFrom({ data: { id: 'o1', user_id: 'user-1', points_earned: 0 }, error: null });
    queueFrom({ data: null, error: null });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(2);
  });

  it('stops if total computed points is zero', async () => {
    queueFrom({ data: { id: 'o1', user_id: 'user-1', points_earned: 0 }, error: null });
    queueFrom({
      data: [{ id: 'item-1', quantity: 2, products: { loyalty_points: 0 } }],
      error: null,
    });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(2);
  });

  it('does not double-award if the atomic claim update affects no rows (race lost)', async () => {
    queueFrom({ data: { id: 'o1', user_id: 'user-1', points_earned: 0 }, error: null });
    queueFrom({
      data: [{ id: 'item-1', quantity: 1, products: { loyalty_points: 10 } }],
      error: null,
    });
    queueFrom({ data: [], error: null });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(3);
  });

  it('awards points end-to-end on the happy path', async () => {
    queueFrom({ data: { id: 'o1', user_id: 'user-1', points_earned: 0 }, error: null });
    queueFrom({
      data: [{ id: 'item-1', quantity: 2, products: { loyalty_points: 5 } }],
      error: null,
    });
    queueFrom({ data: [{ id: 'o1' }], error: null });
    queueFrom({ data: null, error: null });
    queueFrom({ data: { loyalty_points_balance: 100 }, error: null });
    queueFrom({ data: null, error: null });
    queueFrom({ data: null, error: null });

    await awardLoyaltyPoints('order-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(7);
    const txChain = supabaseAdminMock.from.mock.results[6].value;
    expect(txChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        order_id: 'order-1',
        type: 'earn',
        points: 10,
        balance_after: 110,
      })
    );
  });
});