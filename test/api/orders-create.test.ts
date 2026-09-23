import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, mocks } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  mocks: {
    getUserFromRequest: vi.fn(),
    validateCoupon: vi.fn(),
    recordCouponRedemption: vi.fn(),
    computeDeliveryCharge: vi.fn(),
    computeTax: vi.fn(),
    getDeliverySettings: vi.fn(),
    getEarliestDeliveryDate: vi.fn(),
    awardLoyaltyPoints: vi.fn(),
    signOrderToken: vi.fn(),
    completeReferralIfEligible: vi.fn(),
    isPincodeServiceable: vi.fn(),
  },
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/auth', () => ({ getUserFromRequest: mocks.getUserFromRequest }));
vi.mock('@/lib/coupon', () => ({
  validateCoupon: mocks.validateCoupon,
  recordCouponRedemption: mocks.recordCouponRedemption,
}));
vi.mock('@/lib/deliverySettings', () => ({
  computeDeliveryCharge: mocks.computeDeliveryCharge,
  computeTax: mocks.computeTax,
  getDeliverySettings: mocks.getDeliverySettings,
  getEarliestDeliveryDate: mocks.getEarliestDeliveryDate,
}));
vi.mock('@/lib/loyalty', () => ({ awardLoyaltyPoints: mocks.awardLoyaltyPoints }));
vi.mock('@/lib/orderToken', () => ({ signOrderToken: mocks.signOrderToken }));
vi.mock('@/lib/referrel', () => ({ completeReferralIfEligible: mocks.completeReferralIfEligible }));
vi.mock('@/lib/serviceablePincode', () => ({ isPincodeServiceable: mocks.isPincodeServiceable }));

import { GET, POST } from '@/app/api/orders/route';

function queueFrom(result: { data: unknown; error: unknown; count?: number | null }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

const validBody = {
  customer_name: 'Asha',
  customer_phone: '9876543210',
  items: [{ product_id: 'p1', quantity: 2 }],
  delivery_address: '123 Main St',
  delivery_pincode: '221001',
  idempotency_key: 'idem-1',
};

const settings = {
  is_delivery_free: false,
  delivery_charge: 40,
  free_delivery_threshold: 500,
  tax_percent: 5,
  min_lead_days: 1,
};

function req(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserFromRequest.mockReturnValue(null);
  mocks.getDeliverySettings.mockResolvedValue(settings);
  mocks.getEarliestDeliveryDate.mockReturnValue('2024-06-16');
  mocks.isPincodeServiceable.mockResolvedValue({ serviceable: true, area_name: 'Sigra' });
  mocks.computeDeliveryCharge.mockReturnValue(40);
  mocks.computeTax.mockReturnValue(5);
  mocks.signOrderToken.mockReturnValue('signed-order-token');
});

describe('POST /api/orders — validation', () => {
  it('rejects missing customer_name/phone', async () => {
    const res = await POST(req({ ...validBody, customer_name: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid Indian phone number', async () => {
    const res = await POST(req({ ...validBody, customer_phone: '12345' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid Indian phone number');
  });

  it('rejects a missing delivery_address', async () => {
    const res = await POST(req({ ...validBody, delivery_address: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects a missing idempotency_key', async () => {
    const res = await POST(req({ ...validBody, idempotency_key: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects an empty items array', async () => {
    const res = await POST(req({ ...validBody, items: [] }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/orders — idempotency', () => {
  it('returns the existing order (200) without recreating it', async () => {
    const existing = { id: 'existing-order' };
    queueFrom({ data: existing, error: null }); // idempotency lookup

    const res = await POST(req(validBody));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(existing);
    expect(body.orderToken).toBe('signed-order-token');
    // must not touch products/orders insert path
    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/orders — pincode', () => {
  it('rejects a missing delivery_pincode', async () => {
    queueFrom({ data: null, error: null }); // idempotency lookup — no existing order
    const res = await POST(req({ ...validBody, delivery_pincode: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unserviceable pincode', async () => {
    queueFrom({ data: null, error: null });
    mocks.isPincodeServiceable.mockResolvedValue({ serviceable: false, area_name: null });

    const res = await POST(req(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("don't deliver");
  });
});

describe('POST /api/orders — product validation', () => {
  it('errors if a product in the request does not exist', async () => {
    queueFrom({ data: null, error: null }); // idempotency
    queueFrom({ data: [], error: null }); // products lookup — empty

    const res = await POST(req(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Product not found');
  });

  it('errors if a product is unavailable', async () => {
    queueFrom({ data: null, error: null });
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: false, stock_quantity: null }],
      error: null,
    });

    const res = await POST(req(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('no longer available');
  });

  it('errors on non-positive/non-integer quantity', async () => {
    queueFrom({ data: null, error: null });
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: true, stock_quantity: null }],
      error: null,
    });

    const res = await POST(req({ ...validBody, items: [{ product_id: 'p1', quantity: 0 }] }));
    expect(res.status).toBe(400);
  });

  it('errors when quantity exceeds stock', async () => {
    queueFrom({ data: null, error: null });
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: true, stock_quantity: 1 }],
      error: null,
    });

    const res = await POST(req({ ...validBody, items: [{ product_id: 'p1', quantity: 5 }] }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Only 1 left in stock');
  });

  it('reports out of stock distinctly from low stock', async () => {
    queueFrom({ data: null, error: null });
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: true, stock_quantity: 0 }],
      error: null,
    });

    const res = await POST(req({ ...validBody, items: [{ product_id: 'p1', quantity: 1 }] }));
    const body = await res.json();

    expect(body.error).toContain('Out of stock');
  });
});

describe('POST /api/orders — coupon handling', () => {
  it('rejects when the coupon is invalid', async () => {
    queueFrom({ data: null, error: null }); // idempotency
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: true, stock_quantity: null }],
      error: null,
    }); // products
    mocks.validateCoupon.mockResolvedValue({ valid: false, error: 'Invalid coupon code' });

    const res = await POST(req({ ...validBody, coupon_code: 'BAD' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid coupon code');
  });
});

describe('POST /api/orders — happy path', () => {
  function queueHappyPath(overrides: { paymentMethod?: 'online' | 'cod' } = {}) {
    queueFrom({ data: null, error: null }); // idempotency lookup: none
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: true, stock_quantity: 10 }],
      error: null,
    }); // products
    queueFrom({
      data: { id: 'new-order-id', total: 205 },
      error: null,
    }); // orders insert
    queueFrom({ data: null, error: null }); // order_items insert
    queueFrom({ data: null, error: null }); // stock decrement update
  }

  it('creates a COD order, awards loyalty points, and returns 201', async () => {
    queueHappyPath();

    const res = await POST(req({ ...validBody, payment_method: 'cod' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toMatchObject({ id: 'new-order-id' });
    expect(body.orderToken).toBe('signed-order-token');
    expect(mocks.awardLoyaltyPoints).toHaveBeenCalledWith('new-order-id');
  });

  it('creates an online order with status pending and does not award loyalty points yet', async () => {
    queueHappyPath();

    const res = await POST(req({ ...validBody, payment_method: 'online' }));

    expect(res.status).toBe(201);
    expect(mocks.awardLoyaltyPoints).not.toHaveBeenCalled();

    const insertChain = supabaseAdminMock.from.mock.results[2].value; // orders insert call
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', payment_method: 'online' })
    );
  });

  it('rolls back the order if inserting order_items fails', async () => {
    queueFrom({ data: null, error: null }); // idempotency
    queueFrom({
      data: [{ id: 'p1', price: 100, is_available: true, stock_quantity: 10 }],
      error: null,
    }); // products
    queueFrom({ data: { id: 'new-order-id', total: 205 }, error: null }); // orders insert
    queueFrom({ data: null, error: { message: 'insert failed' } }); // order_items insert fails
    queueFrom({ data: null, error: null }); // rollback delete

    const res = await POST(req(validBody));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('insert failed');
    const deleteChain = supabaseAdminMock.from.mock.results[4].value;
    expect(deleteChain.delete).toHaveBeenCalled();
  });

  it('forces the delivery date to the earliest allowed date when none is given', async () => {
    queueHappyPath();

    await POST(req(validBody));

    const insertChain = supabaseAdminMock.from.mock.results[2].value;
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ delivery_date: '2024-06-16' })
    );
  });

  it('overrides a client-supplied delivery_date earlier than the allowed minimum', async () => {
    queueHappyPath();

    await POST(req({ ...validBody, delivery_date: '2020-01-01' }));

    const insertChain = supabaseAdminMock.from.mock.results[2].value;
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ delivery_date: '2024-06-16' })
    );
  });
});

describe('GET /api/orders', () => {
  it('is disabled and returns 405', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});