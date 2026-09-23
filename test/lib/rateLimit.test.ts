import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { checkOtpRateLimit, logOtpRequest } from '@/lib/rateLimit';

function queueFrom(result: { data: unknown; error: unknown; count?: number | null }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('checkOtpRateLimit', () => {
  it('allows the request when under the limit', async () => {
    queueFrom({ data: null, error: null, count: 2 });

    await expect(checkOtpRateLimit('+919876543210')).resolves.toBeUndefined();
  });

  it('throws when at or above the limit', async () => {
    queueFrom({ data: null, error: null, count: 3 });

    await expect(checkOtpRateLimit('+919876543210')).rejects.toThrow(
      'Too many OTP requests. Please try again in a few minutes.'
    );
  });

  it('propagates a database error', async () => {
    queueFrom({ data: null, error: { message: 'db down' }, count: null });

    await expect(checkOtpRateLimit('+919876543210')).rejects.toThrow('db down');
  });
});

describe('logOtpRequest', () => {
  it('inserts the request with the given purpose and ip', async () => {
    queueFrom({ data: null, error: null });

    await logOtpRequest('+919876543210', 'login', '127.0.0.1');

    const chain = supabaseAdminMock.from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith({
      phone: '+919876543210',
      purpose: 'login',
      ip_address: '127.0.0.1',
    });
  });
});