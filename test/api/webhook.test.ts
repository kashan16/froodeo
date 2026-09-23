import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, awardLoyaltyPointsMock, completeReferralIfEligibleMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  awardLoyaltyPointsMock: vi.fn(),
  completeReferralIfEligibleMock: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/loyalty', () => ({ awardLoyaltyPoints: awardLoyaltyPointsMock }));
vi.mock('@/lib/referrel', () => ({ completeReferralIfEligible: completeReferralIfEligibleMock }));

import { POST } from '@/app/api/webhooks/razorpay/route';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

function signedReq(payload: object) {
  const raw = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(raw)
    .digest('hex');

  return new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    body: raw,
    headers: { 'x-razorpay-signature': signature },
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/payments/webhook', () => {
  it('rejects a request with no signature header', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({ event: 'payment.captured', payload: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects an invalid signature', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({ event: 'payment.captured', payload: {} }),
      headers: { 'x-razorpay-signature': 'wrong-signature' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('processes payment.captured: updates payment, order, and awards loyalty points', async () => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_rzp_1', method: 'upi' } },
        order: { entity: { id: 'order_rzp_1' } },
      },
    };
    queueFrom({ data: { id: 'pay-1', order_id: 'order-1', status: 'created' }, error: null }); // fetch by razorpay_order_id
    queueFrom({ data: null, error: null }); // update payment
    queueFrom({ data: null, error: null }); // update order
    queueFrom({ data: { user_id: 'user-1' }, error: null }); // fetch order for referral

    const res = await POST(signedReq(payload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.acknowledged).toBe(true);
    expect(awardLoyaltyPointsMock).toHaveBeenCalledWith('order-1');
    expect(completeReferralIfEligibleMock).toHaveBeenCalledWith('user-1');

    const paymentUpdateChain = supabaseAdminMock.from.mock.results[1].value;
    expect(paymentUpdateChain.update).toHaveBeenCalledWith({
      razorpay_payment_id: 'pay_rzp_1',
      status: 'captured',
      method: 'upi',
    });
  });

  it('is idempotent — skips already-captured payments without re-processing', async () => {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_rzp_1', method: 'upi' } },
        order: { entity: { id: 'order_rzp_1' } },
      },
    };
    queueFrom({ data: { id: 'pay-1', order_id: 'order-1', status: 'captured' }, error: null });

    const res = await POST(signedReq(payload));

    expect(res.status).toBe(200);
    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
    expect(awardLoyaltyPointsMock).not.toHaveBeenCalled();
  });

  it('acks 200 even when no matching payment record is found (logs, does not throw)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_rzp_1', method: 'upi' } },
        order: { entity: { id: 'unknown_order' } },
      },
    };
    queueFrom({ data: null, error: { message: 'nf' } });

    const res = await POST(signedReq(payload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.acknowledged).toBe(true);
    consoleSpy.mockRestore();
  });

  it('processes payment.failed: marks the payment failed and leaves order pending', async () => {
    const payload = {
      event: 'payment.failed',
      payload: {
        payment: { entity: { id: 'pay_rzp_1' } },
        order: { entity: { id: 'order_rzp_1' } },
      },
    };
    queueFrom({ data: { id: 'pay-1', order_id: 'order-1', status: 'created' }, error: null });
    queueFrom({ data: null, error: null }); // update payment to failed

    const res = await POST(signedReq(payload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.acknowledged).toBe(true);

    const updateChain = supabaseAdminMock.from.mock.results[1].value;
    expect(updateChain.update).toHaveBeenCalledWith({
      razorpay_payment_id: 'pay_rzp_1',
      status: 'failed',
    });
  });

  it('still acks 200 if an unexpected error is thrown while processing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const payload = { event: 'payment.captured', payload: { payment: {}, order: {} } }; // malformed → will throw accessing .entity.id

    const res = await POST(signedReq(payload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.acknowledged).toBe(true);
    consoleSpy.mockRestore();
  });

  it('ignores unrecognized event types but still acks', async () => {
    const payload = { event: 'order.paid', payload: {} };

    const res = await POST(signedReq(payload));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.acknowledged).toBe(true);
    expect(supabaseAdminMock.from).not.toHaveBeenCalled();
  });
});