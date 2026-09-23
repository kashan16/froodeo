import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, requireAdminMock, createRazorpayRefundMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  requireAdminMock: vi.fn(),
  createRazorpayRefundMock: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: requireAdminMock }));
vi.mock('@/lib/razorpay', () => ({ createRazorpayRefund: createRazorpayRefundMock }));

import { POST } from '@/app/api/admin/payments/[id]/refund/route';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

const fakeAdmin = { sub: 'admin-1', username: 'root', role: 'admin' as const };

function req(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/admin/payments/pay-1/refund', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockReturnValue(fakeAdmin);
});

describe('POST /api/admin/payments/:id/refund', () => {
  it('returns 404 for a missing payment', async () => {
    queueFrom({ data: null, error: { message: 'nf' } });

    const res = await POST(req(), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(404);
  });

  it('rejects refunding a non-captured payment', async () => {
    queueFrom({ data: { id: 'pay-1', status: 'created', amount: 10000 }, error: null });

    const res = await POST(req(), { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("status 'created'");
  });

  it('rejects a captured payment with no razorpay_payment_id on record', async () => {
    queueFrom({ data: { id: 'pay-1', status: 'captured', amount: 10000, razorpay_payment_id: null }, error: null });

    const res = await POST(req(), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects a partial refund amount exceeding the captured amount', async () => {
    queueFrom({
      data: { id: 'pay-1', status: 'captured', amount: 10000, razorpay_payment_id: 'rzp_pay_1' },
      error: null,
    });

    const res = await POST(req({ amount: 200 }), { params: Promise.resolve({ id: 'pay-1' }) }); // 200*100=20000 > 10000

    expect(res.status).toBe(400);
  });

  it('rejects a non-positive amount', async () => {
    queueFrom({
      data: { id: 'pay-1', status: 'captured', amount: 10000, razorpay_payment_id: 'rzp_pay_1' },
      error: null,
    });

    const res = await POST(req({ amount: -5 }), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(400);
  });

  it('performs a full refund, marks the payment refunded, and cancels the order', async () => {
    queueFrom({
      data: { id: 'pay-1', status: 'captured', amount: 10000, razorpay_payment_id: 'rzp_pay_1', order_id: 'order-1' },
      error: null,
    });
    createRazorpayRefundMock.mockResolvedValue({ id: 'rfnd_1' });
    queueFrom({ data: { id: 'pay-1', status: 'refunded' }, error: null }); // update payment
    queueFrom({ data: null, error: null }); // cancel order

    const res = await POST(req(), { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('refunded');
    expect(createRazorpayRefundMock).toHaveBeenCalledWith('rzp_pay_1', undefined, 'refund_pay-1_full');

    const orderChain = supabaseAdminMock.from.mock.results[2].value;
    expect(orderChain.update).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  it('performs a partial refund and does not cancel the order', async () => {
    queueFrom({
      data: { id: 'pay-1', status: 'captured', amount: 10000, razorpay_payment_id: 'rzp_pay_1', order_id: 'order-1' },
      error: null,
    });
    createRazorpayRefundMock.mockResolvedValue({ id: 'rfnd_1' });
    queueFrom({ data: { id: 'pay-1', status: 'captured' }, error: null }); // update — status unchanged

    const res = await POST(req({ amount: 50 }), { params: Promise.resolve({ id: 'pay-1' }) }); // 5000 paise, partial

    expect(res.status).toBe(200);
    // only 2 from() calls: fetch + update, no order cancellation
    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(2);
  });

  it('returns 500 with the Razorpay error message when the refund API call fails', async () => {
    queueFrom({
      data: { id: 'pay-1', status: 'captured', amount: 10000, razorpay_payment_id: 'rzp_pay_1', order_id: 'order-1' },
      error: null,
    });
    createRazorpayRefundMock.mockRejectedValue(new Error('Razorpay refund failed'));

    const res = await POST(req(), { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Razorpay refund failed');
  });
});