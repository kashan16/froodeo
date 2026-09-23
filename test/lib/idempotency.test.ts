import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { getExistingPayment } from '@/lib/idempotency';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('getExistingPayment', () => {
  it('returns the most recent non-failed payment for the order', async () => {
    const payment = { id: 'pay-1', status: 'created' };
    queueFrom({ data: payment, error: null });

    const result = await getExistingPayment('order-1');

    expect(result).toEqual(payment);
    const chain = supabaseAdminMock.from.mock.results[0].value;
    expect(chain.neq).toHaveBeenCalledWith('status', 'failed');
  });

  it('returns null when none exists', async () => {
    queueFrom({ data: null, error: null });

    expect(await getExistingPayment('order-1')).toBeNull();
  });

  it('returns null (not throws) on a database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    queueFrom({ data: null, error: { message: 'db down' } });

    const result = await getExistingPayment('order-1');

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});