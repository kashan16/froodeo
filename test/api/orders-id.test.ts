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

import { GET } from '@/app/api/orders/[id]/route';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/orders/:id', () => {
  it('returns 404 when the order does not exist', async () => {
    queueFrom({ data: null, error: { message: 'nf' } });
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue(null);

    const req = new NextRequest('http://localhost/api/orders/missing');
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) });

    expect(res.status).toBe(404);
  });

  it('returns 401 when neither the order token nor the user owns the order', async () => {
    queueFrom({ data: { id: 'order-1', user_id: 'other-user' }, error: null });
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue(null);

    const req = new NextRequest('http://localhost/api/orders/order-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-1' }) });

    expect(res.status).toBe(401);
  });

  it('grants access via a matching order token', async () => {
    const order = { id: 'order-1', user_id: null };
    queueFrom({ data: order, error: null });
    getVerifiedOrderTokenFromRequestMock.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    getUserFromRequestMock.mockReturnValue(null);

    const req = new NextRequest('http://localhost/api/orders/order-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(order);
  });

  it('denies access via a token for a different order', async () => {
    queueFrom({ data: { id: 'order-1', user_id: null }, error: null });
    getVerifiedOrderTokenFromRequestMock.mockReturnValue({ order_id: 'other-order', guest_id: 'g1' });
    getUserFromRequestMock.mockReturnValue(null);

    const req = new NextRequest('http://localhost/api/orders/order-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-1' }) });

    expect(res.status).toBe(401);
  });

  it('grants access to the owning logged-in user', async () => {
    const order = { id: 'order-1', user_id: 'user-1' };
    queueFrom({ data: order, error: null });
    getVerifiedOrderTokenFromRequestMock.mockReturnValue(null);
    getUserFromRequestMock.mockReturnValue({ sub: 'user-1', phone: '+919876543210' });

    const req = new NextRequest('http://localhost/api/orders/order-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'order-1' }) });

    expect(res.status).toBe(200);
  });
});