/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    createRazorpayOrder,
    createRazorpayRefund,
    verifyRazorpaySignature,
} from '@/lib/razorpay';
import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('verifyRazorpaySignature', () => {
  it('accepts a correctly computed signature', () => {
    const orderId = 'order_abc';
    const paymentId = 'pay_xyz';
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(verifyRazorpaySignature(orderId, paymentId, expected)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    expect(verifyRazorpaySignature('order_abc', 'pay_xyz', 'not-the-right-signature')).toBe(false);
  });

  it('rejects a signature computed for different ids', () => {
    const wrongSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update('order_other|pay_other')
      .digest('hex');

    expect(verifyRazorpaySignature('order_abc', 'pay_xyz', wrongSig)).toBe(false);
  });
});

describe('createRazorpayOrder', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends amount in paise and returns the parsed order', async () => {
    const fakeOrder = { id: 'order_razorpay_1' };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => fakeOrder,
    });

    const result = await createRazorpayOrder(500, 'receipt-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/orders',
      expect.objectContaining({ method: 'POST' })
    );
    const callArgs = (global.fetch as any).mock.calls[0][1];
    const sentBody = JSON.parse(callArgs.body);
    expect(sentBody).toEqual({ amount: 50000, currency: 'INR', receipt: 'receipt-1' });
    expect(result).toEqual(fakeOrder);
  });

  it('throws when the Razorpay API responds with a non-ok status', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });

    await expect(createRazorpayOrder(500, 'receipt-1')).rejects.toThrow(
      'Failed to create Razorpay order'
    );
  });
});

describe('createRazorpayRefund', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends no amount for a full refund', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'rfnd_1' }) });

    await createRazorpayRefund('pay_1');

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(JSON.parse(callArgs.body)).toEqual({});
  });

  it('sends the amount for a partial refund', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'rfnd_1' }) });

    await createRazorpayRefund('pay_1', 20000);

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(JSON.parse(callArgs.body)).toEqual({ amount: 20000 });
  });

  it('includes the idempotency header when provided', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'rfnd_1' }) });

    await createRazorpayRefund('pay_1', 20000, 'refund_pay_1_20000');

    const callArgs = (global.fetch as any).mock.calls[0][1];
    expect(callArgs.headers['X-Razorpay-Idempotency']).toBe('refund_pay_1_20000');
  });

  it('throws with the Razorpay error description on failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { description: 'Payment not captured' } }),
    });

    await expect(createRazorpayRefund('pay_1')).rejects.toThrow('Payment not captured');
  });

  it('falls back to a generic message if the error body cannot be parsed', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('bad json');
      },
    });

    await expect(createRazorpayRefund('pay_1')).rejects.toThrow('Failed to create Razorpay refund');
  });
});