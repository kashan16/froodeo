import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { completeReferralIfEligible, linkReferral } from '@/lib/referrel';

function queueFrom(result: { data: unknown; error: unknown; count?: number | null }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('completeReferralIfEligible', () => {
  it('does nothing when there is no pending referral', async () => {
    queueFrom({ data: null, error: null });

    await completeReferralIfEligible('user-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });

  it('does not complete when priorOrders count exceeds 1', async () => {
    queueFrom({
      data: { id: 'ref-1', referrer_id: 'referrer-1', referred_id: 'user-1', status: 'pending' },
      error: null,
    });
    queueFrom({ data: null, error: null, count: 2 });

    await completeReferralIfEligible('user-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(2);
  });

  it('completes the referral and rewards the referrer on eligible first order', async () => {
    queueFrom({
      data: { id: 'ref-1', referrer_id: 'referrer-1', referred_id: 'user-1', status: 'pending' },
      error: null,
    });
    queueFrom({ data: null, error: null, count: 1 });
    queueFrom({ data: null, error: null });
    queueFrom({ data: { loyalty_points_balance: 20 }, error: null });
    queueFrom({ data: null, error: null });
    queueFrom({ data: null, error: null });

    await completeReferralIfEligible('user-1');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(6);
    const txChain = supabaseAdminMock.from.mock.results[5].value;
    expect(txChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'referrer-1',
        type: 'earn',
        points: 50,
        balance_after: 70,
      })
    );
  });
});

describe('linkReferral', () => {
  it('does nothing when the referral code does not match anyone', async () => {
    queueFrom({ data: null, error: null });

    await linkReferral('new-user', 'BADCODE');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });

  it('does nothing on self-referral', async () => {
    queueFrom({ data: { id: 'user-1' }, error: null });

    await linkReferral('user-1', 'OWNCODE');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });

  it('links a valid referral', async () => {
    queueFrom({ data: { id: 'referrer-1' }, error: null });
    queueFrom({ data: null, error: null });
    queueFrom({ data: null, error: null });

    await linkReferral('new-user', '  ABC123  ');

    const insertChain = supabaseAdminMock.from.mock.results[2].value;
    expect(insertChain.insert).toHaveBeenCalledWith({
      referrer_id: 'referrer-1',
      referred_id: 'new-user',
      referral_code: 'ABC123',
      status: 'pending',
    });
  });
});