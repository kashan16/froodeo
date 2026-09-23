import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, getVerifiedOrderTokenFromRequestMock, getUserFromRequestMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  getVerifiedOrderTokenFromRequestMock: vi.fn(),
  getUserFromRequestMock: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/orderToken', () => ({
  getVerifiedOrderTokenFromRequest: getVerifiedOrderTokenFromRequestMock,
}));
vi.mock('@/lib/auth', () => ({ getUserFromRequest: getUserFromRequestMock }));

import { canAccessOrder } from '@/lib/orderAccess';

function queueFrom(result: { data: unknown; error: unknown; count?: number | null }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('canAccessOrder', () => {
  it('grants access when the order token matches the order id', async () => {
    getVerifiedOrderTokenFromRequestMock.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    const req = new NextRequest('http://localhost/api/orders/order-1');

    const result = await canAccessOrder(req, 'order-1');

    expect(result).toBe(true);
    expect(supabaseAdminMock.from).not.toHaveBeenCalled();
  });

  it('falls through to user ownership when the order token is for a different order', async () => {
    getVerifiedOrderTokenFromRequestMock.mockReturnValue({ order_id: 'other-order', guest_id: 'g1' });
    getUserFromRequestMock.mockReturnValue(null);
    const req = new NextRequest('http://localhost/api/orders/order-1');

    const result = await canAccessOrder(req, 'order-1');

    expect(result).toBe(false);
  });

  it('denies access with no token and no user', async () => {
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue(null);
    const req = new NextRequest('http://localhost/api/orders/order-1');

    expect(await canAccessOrder(req, 'order-1')).toBe(false);
    expect(supabaseAdminMock.from).not.toHaveBeenCalled();
  });

  it('grants access when the logged-in user owns the order', async () => {
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue({ sub: 'user-1', phone: '+919876543210' });
    queueFrom({ data: { user_id: 'user-1' }, error: null });
    const req = new NextRequest('http://localhost/api/orders/order-1');

    expect(await canAccessOrder(req, 'order-1')).toBe(true);
  });

  it('denies access when the logged-in user does not own the order', async () => {
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue({ sub: 'user-1', phone: '+919876543210' });
    queueFrom({ data: { user_id: 'someone-else' }, error: null });
    const req = new NextRequest('http://localhost/api/orders/order-1');

    expect(await canAccessOrder(req, 'order-1')).toBe(false);
  });

  it('denies access when the order does not exist', async () => {
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue({ sub: 'user-1', phone: '+919876543210' });
    queueFrom({ data: null, error: { message: 'not found' } });
    const req = new NextRequest('http://localhost/api/orders/order-1');

    expect(await canAccessOrder(req, 'order-1')).toBe(false);
  });
});