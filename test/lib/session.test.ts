import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));

import { createRefreshSession, getValidSession, revokeSession, rotateSession } from '@/lib/session';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('createRefreshSession', () => {
  it('inserts a hashed token (never the raw token) and returns the raw token', async () => {
    queueFrom({ data: null, error: null });

    const token = await createRefreshSession('user-1', 'jest-agent', '127.0.0.1');

    expect(token).toMatch(/^[0-9a-f]{80}$/);
    const chain = supabaseAdminMock.from.mock.results[0].value;
    const insertArg = chain.insert.mock.calls[0][0];
    expect(insertArg.user_id).toBe('user-1');
    expect(insertArg.refresh_token_hash).not.toBe(token);
    expect(insertArg.refresh_token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('throws when the insert fails', async () => {
    queueFrom({ data: null, error: { message: 'insert failed' } });

    await expect(createRefreshSession('user-1', null, null)).rejects.toThrow('insert failed');
  });
});

describe('getValidSession', () => {
  it('returns the session row when found', async () => {
    const row = { id: 'session-1', user_id: 'user-1' };
    queueFrom({ data: row, error: null });

    const result = await getValidSession('some-raw-token');

    expect(result).toEqual(row);
  });

  it('returns null when no matching non-revoked, non-expired session exists', async () => {
    queueFrom({ data: null, error: { message: 'not found' } });

    expect(await getValidSession('bad-token')).toBeNull();
  });
});

describe('revokeSession', () => {
  it('sets revoked_at on the matching session', async () => {
    queueFrom({ data: null, error: null });

    await revokeSession('some-token');

    const chain = supabaseAdminMock.from.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
  });
});

describe('rotateSession', () => {
  it('revokes the old session and creates a new one', async () => {
    queueFrom({ data: null, error: null });
    queueFrom({ data: null, error: null });

    const newToken = await rotateSession('old-token', 'user-1', 'agent', '1.2.3.4');

    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(2);
    expect(newToken).toMatch(/^[0-9a-f]{80}$/);
  });
});