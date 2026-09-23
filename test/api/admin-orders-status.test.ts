import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, requireAdminMock, awardLoyaltyPointsMock, completeReferralIfEligibleMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  requireAdminMock: vi.fn(),
  awardLoyaltyPointsMock: vi.fn(),
  completeReferralIfEligibleMock: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/loyalty', () => ({ awardLoyaltyPoints: awardLoyaltyPointsMock }));
vi.mock('@/lib/referrel', () => ({ completeReferralIfEligible: completeReferralIfEligibleMock }));

import { PATCH } from '@/app/api/admin/orders/[id]/status/route';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

const fakeAdmin = { sub: 'admin-1', username: 'root', role: 'admin' as const };

function req(status: string) {
  return new NextRequest('http://localhost/api/admin/orders/order-1/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockReturnValue(fakeAdmin);
});

describe('PATCH /api/admin/orders/:id/status', () => {
  it('rejects an invalid status value', async () => {
    const res = await PATCH(req('bogus'), { params: Promise.resolve({ id: 'order-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing order', async () => {
    queueFrom({ data: null, error: { message: 'nf' } });

    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'order-1' }) });
    expect(res.status).toBe(404);
  });

  it('rejects a same-status transition', async () => {
    queueFrom({ data: { id: 'order-1', status: 'pending', user_id: null, payment_method: 'cod' }, error: null });

    const res = await PATCH(req('pending'), { params: Promise.resolve({ id: 'order-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order is already pending');
  });

  it('rejects an illegal transition (e.g. pending -> delivered)', async () => {
    queueFrom({ data: { id: 'order-1', status: 'pending', user_id: null, payment_method: 'cod' }, error: null });

    const res = await PATCH(req('delivered'), { params: Promise.resolve({ id: 'order-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Cannot move order from pending to delivered');
  });

  it('blocks manually confirming an online-payment order', async () => {
    queueFrom({ data: { id: 'order-1', status: 'pending', user_id: null, payment_method: 'online' }, error: null });

    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'order-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('confirmed automatically');
  });

  it('allows confirming a COD order', async () => {
    queueFrom({ data: { id: 'order-1', status: 'pending', user_id: null, payment_method: 'cod' }, error: null });
    queueFrom({ data: { id: 'order-1', status: 'confirmed' }, error: null });

    const res = await PATCH(req('confirmed'), { params: Promise.resolve({ id: 'order-1' }) });
    expect(res.status).toBe(200);
  });

  it('awards loyalty points on delivery for non-COD orders and completes referral', async () => {
    queueFrom({
      data: { id: 'order-1', status: 'out_for_delivery', user_id: 'user-1', payment_method: 'online' },
      error: null,
    });
    queueFrom({ data: { id: 'order-1', status: 'delivered' }, error: null });

    const res = await PATCH(req('delivered'), { params: Promise.resolve({ id: 'order-1' }) });

    expect(res.status).toBe(200);
    expect(awardLoyaltyPointsMock).toHaveBeenCalledWith('order-1');
    expect(completeReferralIfEligibleMock).toHaveBeenCalledWith('user-1');
  });

  it('does not re-award loyalty points on delivery for COD orders (already awarded at creation)', async () => {
    queueFrom({
      data: { id: 'order-1', status: 'out_for_delivery', user_id: 'user-1', payment_method: 'cod' },
      error: null,
    });
    queueFrom({ data: { id: 'order-1', status: 'delivered' }, error: null });

    await PATCH(req('delivered'), { params: Promise.resolve({ id: 'order-1' }) });

    expect(awardLoyaltyPointsMock).not.toHaveBeenCalled();
  });

  it('allows cancellation from any non-terminal state', async () => {
    queueFrom({ data: { id: 'order-1', status: 'preparing', user_id: null, payment_method: 'cod' }, error: null });
    queueFrom({ data: { id: 'order-1', status: 'cancelled' }, error: null });

    const res = await PATCH(req('cancelled'), { params: Promise.resolve({ id: 'order-1' }) });
    expect(res.status).toBe(200);
  });

  it('rejects any transition out of a terminal state', async () => {
    queueFrom({ data: { id: 'order-1', status: 'delivered', user_id: null, payment_method: 'cod' }, error: null });

    const res = await PATCH(req('cancelled'), { params: Promise.resolve({ id: 'order-1' }) });
    expect(res.status).toBe(400);
  });
});