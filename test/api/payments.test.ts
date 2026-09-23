import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, mocks } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  mocks: {
    getExistingPayment: vi.fn(),
    signOrderToken: vi.fn(),
    getVerifiedOrderTokenFromRequest: vi.fn(),
    createRazorpayOrder: vi.fn(),
    verifyRazorpaySignature: vi.fn(),
    canAccessOrder: vi.fn(),
  },
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/idempotency', () => ({ getExistingPayment: mocks.getExistingPayment }));
vi.mock('@/lib/orderToken', () => ({
  signOrderToken: mocks.signOrderToken,
  getVerifiedOrderTokenFromRequest: mocks.getVerifiedOrderTokenFromRequest,
}));
vi.mock('@/lib/razorpay', () => ({
  createRazorpayOrder: mocks.createRazorpayOrder,
  verifyRazorpaySignature: mocks.verifyRazorpaySignature,
}));
vi.mock('@/lib/orderAccess', () => ({ canAccessOrder: mocks.canAccessOrder }));

import { GET as getPayment } from '@/app/api/payments/[id]/route';
import { POST as verifyPayment } from '@/app/api/payments/[id]/verify/route';
import { POST as initPayment } from '@/app/api/payments/init/route';
import { POST as createPaymentDisabled, GET as listPayments } from '@/app/api/payments/route';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOrderToken.mockReturnValue('order-token');
});

describe('POST /api/payments/init', () => {
  function req(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/payments/init', {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  it('rejects a missing order_id', async () => {
    const res = await initPayment(req({}));
    expect(res.status).toBe(400);
  });

  it('reuses an existing non-failed payment instead of creating a new Razorpay order', async () => {
    mocks.getExistingPayment.mockResolvedValue({
      id: 'pay-1',
      razorpay_order_id: 'rzp_order_1',
      amount: 10000,
    });

    const res = await initPayment(req({ order_id: 'order-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paymentId).toBe('pay-1');
    expect(mocks.createRazorpayOrder).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    mocks.getExistingPayment.mockResolvedValue(null);
    queueFrom({ data: null, error: { message: 'nf' } });

    const res = await initPayment(req({ order_id: 'order-1' }));
    expect(res.status).toBe(404);
  });

  it('rejects initializing payment for a non-pending order', async () => {
    mocks.getExistingPayment.mockResolvedValue(null);
    queueFrom({ data: { id: 'order-1', status: 'confirmed', total: 100 }, error: null });

    const res = await initPayment(req({ order_id: 'order-1' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order is not in pending status');
  });

  it('creates a new Razorpay order and payment row on the happy path', async () => {
    mocks.getExistingPayment.mockResolvedValue(null);
    queueFrom({ data: { id: 'order-1', status: 'pending', total: 100 }, error: null });
    mocks.createRazorpayOrder.mockResolvedValue({ id: 'rzp_order_new' });
    queueFrom({ data: { id: 'pay-new' }, error: null });

    const res = await initPayment(req({ order_id: 'order-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.paymentId).toBe('pay-new');
    expect(body.amount).toBe(10000); // total * 100
    expect(body.orderToken).toBe('order-token');
  });

  it('returns 500 with the error message when Razorpay order creation fails', async () => {
    mocks.getExistingPayment.mockResolvedValue(null);
    queueFrom({ data: { id: 'order-1', status: 'pending', total: 100 }, error: null });
    mocks.createRazorpayOrder.mockRejectedValue(new Error('Razorpay is down'));

    const res = await initPayment(req({ order_id: 'order-1' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Razorpay is down');
  });
});

describe('POST /api/payments/:id/verify', () => {
  function req(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/payments/pay-1/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  const validBody = {
    razorpay_payment_id: 'pay_rzp',
    razorpay_order_id: 'order_rzp',
    razorpay_signature: 'sig',
  };

  it('rejects missing payment details', async () => {
    const res = await verifyPayment(req({}), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects when there is no valid order token', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue(null);

    const res = await verifyPayment(req(validBody), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid signature', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    mocks.verifyRazorpaySignature.mockReturnValue(false);

    const res = await verifyPayment(req(validBody), { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Invalid payment signature');
  });

  it('returns 404 when the payment record is missing', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    mocks.verifyRazorpaySignature.mockReturnValue(true);
    queueFrom({ data: null, error: { message: 'nf' } });

    const res = await verifyPayment(req(validBody), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when the payment belongs to a different order than the token', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    mocks.verifyRazorpaySignature.mockReturnValue(true);
    queueFrom({ data: { id: 'pay-1', order_id: 'other-order', status: 'created' }, error: null });

    const res = await verifyPayment(req(validBody), { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(403);
  });

  it('short-circuits with a friendly message if already captured', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    mocks.verifyRazorpaySignature.mockReturnValue(true);
    queueFrom({ data: { id: 'pay-1', order_id: 'order-1', status: 'captured' }, error: null });

    const res = await verifyPayment(req(validBody), { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Payment already verified');
  });

  it('captures the payment and confirms the order on the happy path', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    mocks.verifyRazorpaySignature.mockReturnValue(true);
    queueFrom({ data: { id: 'pay-1', order_id: 'order-1', status: 'created' }, error: null }); // index 0: fetch payment
    queueFrom({ data: { id: 'pay-1', status: 'captured' }, error: null }); // index 1: update payment
    queueFrom({ data: null, error: null }); // index 2: update order

    const res = await verifyPayment(req(validBody), { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('captured');

    const orderUpdateChain = supabaseAdminMock.from.mock.results[2].value;
    expect(orderUpdateChain.update).toHaveBeenCalledWith({ status: 'confirmed' });
  });
});

describe('GET /api/payments/:id', () => {
  it('returns 401 with no valid token', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue(null);
    const req = new NextRequest('http://localhost/api/payments/pay-1');

    const res = await getPayment(req, { params: Promise.resolve({ id: 'pay-1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 for a missing payment', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    queueFrom({ data: null, error: { message: 'nf' } });

    const req = new NextRequest('http://localhost/api/payments/pay-1');
    const res = await getPayment(req, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 when canAccessOrder denies it', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    queueFrom({ data: { id: 'pay-1', order_id: 'order-1' }, error: null });
    mocks.canAccessOrder.mockResolvedValue(false);

    const req = new NextRequest('http://localhost/api/payments/pay-1');
    const res = await getPayment(req, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(res.status).toBe(403);
  });

  it('returns 403 when the token order_id does not match the payment order_id', async () => {
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    queueFrom({ data: { id: 'pay-1', order_id: 'other-order' }, error: null });
    mocks.canAccessOrder.mockResolvedValue(true);

    const req = new NextRequest('http://localhost/api/payments/pay-1');
    const res = await getPayment(req, { params: Promise.resolve({ id: 'pay-1' }) });

    expect(res.status).toBe(403);
  });

  it('returns the payment on success', async () => {
    const payment = { id: 'pay-1', order_id: 'order-1' };
    mocks.getVerifiedOrderTokenFromRequest.mockReturnValue({ order_id: 'order-1', guest_id: 'g1' });
    queueFrom({ data: payment, error: null });
    mocks.canAccessOrder.mockResolvedValue(true);

    const req = new NextRequest('http://localhost/api/payments/pay-1');
    const res = await getPayment(req, { params: Promise.resolve({ id: 'pay-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(payment);
  });
});

describe('GET /api/payments', () => {
  it('rejects a missing order_id query param', async () => {
    const req = new NextRequest('http://localhost/api/payments');
    const res = await listPayments(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthorized for the order', async () => {
    mocks.canAccessOrder.mockResolvedValue(false);
    const req = new NextRequest('http://localhost/api/payments?order_id=order-1');
    const res = await listPayments(req);
    expect(res.status).toBe(401);
  });

  it('returns the order’s payments on success', async () => {
    mocks.canAccessOrder.mockResolvedValue(true);
    const payments = [{ id: 'pay-1' }];
    queueFrom({ data: payments, error: null });

    const req = new NextRequest('http://localhost/api/payments?order_id=order-1');
    const res = await listPayments(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(payments);
  });
});

describe('POST /api/payments', () => {
  it('is disabled and returns 405', async () => {
    const res = await createPaymentDisabled();
    expect(res.status).toBe(405);
  });
});