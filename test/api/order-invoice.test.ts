import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';


const { supabaseAdminMock, generateInvoicePdfMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  generateInvoicePdfMock: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/generateInvoice', () => ({ generateInvoicePdf: generateInvoicePdfMock }));

import { GET } from '@/app/api/orders/[id]/invoice/route';
import { createChain } from '../helpers/supabaseMock';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

const mockOrder = {
  id: 'order-1',
  invoice_number: null,
  created_at: '2026-01-15T10:00:00Z',
  customer_name: 'Jane Doe',
  customer_phone: '9876543210',
  delivery_address: '123 Test St, Lucknow',
  subtotal: 500,
  delivery_charge: 40,
  discount: 0,
  coupon_discount: 0,
  points_discount: 0,
  tax_amount: 25,
  total: 565,
  order_items: [{ products: { name: 'Biryani' }, quantity: 2, unit_price: 250, total_price: 500 }],
};

const mockSettings = {
  business_name: 'Froodeo',
  business_address: 'Lucknow, UP',
  gstin: null,
  pan: null,
  fssai_license: null,
  support_email: 'help@froodeo.com',
  support_phone: '9999999999',
  bank_account_name: null,
  bank_account_number: null,
  bank_ifsc: null,
  bank_name: null,
};

function req() {
  return new NextRequest('http://localhost/api/orders/order-1/invoice');
}

beforeEach(() => {
  vi.clearAllMocks();
  generateInvoicePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
});

describe('GET /api/orders/:id/invoice', () => {
  it('returns 404 when the order does not exist', async () => {
    queueFrom({ data: null, error: null });

    const res = await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });

    expect(res.status).toBe(404);
  });

  it('assigns an invoice number via rpc when the order has none yet', async () => {
    queueFrom({ data: mockOrder, error: null }); // order fetch
    queueFrom({ data: mockSettings, error: null }); // settings fetch
    supabaseAdminMock.rpc.mockResolvedValueOnce({ data: 'INV-00001', error: null });

    const res = await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });

    expect(supabaseAdminMock.rpc).toHaveBeenCalledWith('assign_invoice_number', {
      p_order_id: 'order-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('invoice-INV-00001.pdf');
  });

  it('skips the rpc call when the order already has an invoice number', async () => {
    queueFrom({ data: { ...mockOrder, invoice_number: 'INV-00042' }, error: null });
    queueFrom({ data: mockSettings, error: null });

    const res = await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });

    expect(supabaseAdminMock.rpc).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('invoice-INV-00042.pdf');
  });

  it('returns 500 when invoice number assignment fails', async () => {
    queueFrom({ data: mockOrder, error: null });
    queueFrom({ data: mockSettings, error: null });
    supabaseAdminMock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

    const res = await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to assign invoice number');
  });

  it('passes correctly-shaped data to generateInvoicePdf and returns a PDF response', async () => {
    queueFrom({ data: mockOrder, error: null });
    queueFrom({ data: mockSettings, error: null });
    supabaseAdminMock.rpc.mockResolvedValueOnce({ data: 'INV-00001', error: null });

    const res = await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'INV-00001',
        business: expect.objectContaining({ name: 'Froodeo' }),
        customer: expect.objectContaining({ name: 'Jane Doe', phone: '9876543210' }),
        items: [{ name: 'Biryani', quantity: 2, unit_price: 250, total_price: 500 }],
        subtotal: 500,
        deliveryCharge: 40,
        discount: 0,
        tax: 25,
        total: 565,
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('falls back to "Froodeo" as business name when settings are missing', async () => {
    queueFrom({ data: mockOrder, error: null });
    queueFrom({ data: null, error: null }); // settings fetch fails/missing
    supabaseAdminMock.rpc.mockResolvedValueOnce({ data: 'INV-00001', error: null });

    await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        business: expect.objectContaining({ name: 'Froodeo', address: '' }),
      })
    );
  });

  it('sums discount, coupon_discount, and points_discount into a single discount field', async () => {
    queueFrom({
      data: { ...mockOrder, discount: 10, coupon_discount: 20, points_discount: 5 },
      error: null,
    });
    queueFrom({ data: mockSettings, error: null });
    supabaseAdminMock.rpc.mockResolvedValueOnce({ data: 'INV-00001', error: null });

    await GET(req(), { params: Promise.resolve({ id: 'order-1' }) });

    expect(generateInvoicePdfMock).toHaveBeenCalledWith(
      expect.objectContaining({ discount: 35 })
    );
  });
});