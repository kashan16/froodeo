import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChain } from '../helpers/supabaseMock';

const { supabaseAdminMock, canAccessOrderMock, recalculateOrderTotalsMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn(), rpc: vi.fn() },
  canAccessOrderMock: vi.fn(),
  recalculateOrderTotalsMock: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: supabaseAdminMock }));
vi.mock('@/lib/orderAccess', () => ({ canAccessOrder: canAccessOrderMock }));
vi.mock('@/lib/orderTotals', () => ({ recalculateOrderTotals: recalculateOrderTotalsMock }));

import { DELETE as deleteItem, PUT as updateItem } from '@/app/api/order-items/[id]/route';
import { POST as addItem, GET as listItems } from '@/app/api/orders/[id]/items/route';

function queueFrom(result: { data: unknown; error: unknown }) {
  supabaseAdminMock.from.mockReturnValueOnce(createChain(result));
}

beforeEach(() => {
  vi.clearAllMocks();
  canAccessOrderMock.mockResolvedValue(true);
});

describe('GET /api/orders/:id/items', () => {
  it('returns 401 when the caller cannot access the order', async () => {
    canAccessOrderMock.mockResolvedValue(false);
    const req = new NextRequest('http://localhost/api/orders/order-1/items');

    const res = await listItems(req, { params: Promise.resolve({ id: 'order-1' }) });

    expect(res.status).toBe(401);
  });

  it('returns the joined items on success', async () => {
    const items = [{ id: 'item-1', products: { name: 'Pizza' } }];
    queueFrom({ data: items, error: null });

    const req = new NextRequest('http://localhost/api/orders/order-1/items');
    const res = await listItems(req, { params: Promise.resolve({ id: 'order-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(items);
  });
});

describe('POST /api/orders/:id/items', () => {
  function req(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/orders/order-1/items', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when unauthorized', async () => {
    canAccessOrderMock.mockResolvedValue(false);
    const res = await addItem(req({ product_id: 'p1', quantity: 1 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects modifying a non-pending order', async () => {
    queueFrom({ data: { status: 'confirmed' }, error: null });

    const res = await addItem(req({ product_id: 'p1', quantity: 1 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Order can no longer be modified');
  });

  it('rejects a missing product_id or bad quantity', async () => {
    queueFrom({ data: { status: 'pending' }, error: null });

    const res = await addItem(req({ product_id: '', quantity: 1 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects an unavailable product', async () => {
    queueFrom({ data: { status: 'pending' }, error: null });
    queueFrom({ data: { price: 100, is_available: false, stock_quantity: null }, error: null });

    const res = await addItem(req({ product_id: 'p1', quantity: 1 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Product no longer available');
  });

  it('rejects quantity exceeding stock', async () => {
    queueFrom({ data: { status: 'pending' }, error: null });
    queueFrom({ data: { price: 100, is_available: true, stock_quantity: 2 }, error: null });

    const res = await addItem(req({ product_id: 'p1', quantity: 5 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Only 2 left');
  });

  it('adds the item, decrements stock, and recalculates totals', async () => {
    queueFrom({ data: { status: 'pending' }, error: null });
    queueFrom({ data: { price: 100, is_available: true, stock_quantity: 5 }, error: null });
    queueFrom({ data: { id: 'item-1' }, error: null }); // insert
    queueFrom({ data: null, error: null }); // stock update

    const res = await addItem(req({ product_id: 'p1', quantity: 2 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toEqual({ id: 'item-1' });
    expect(recalculateOrderTotalsMock).toHaveBeenCalledWith('order-1');

    const stockChain = supabaseAdminMock.from.mock.results[3].value;
    expect(stockChain.update).toHaveBeenCalledWith({ stock_quantity: 3 });
  });

  it('does not attempt a stock update for unlimited-stock products', async () => {
    queueFrom({ data: { status: 'pending' }, error: null });
    queueFrom({ data: { price: 100, is_available: true, stock_quantity: null }, error: null });
    queueFrom({ data: { id: 'item-1' }, error: null });

    await addItem(req({ product_id: 'p1', quantity: 2 }), {
      params: Promise.resolve({ id: 'order-1' }),
    });

    // order, product, insert = 3 calls total, no stock update call
    expect(supabaseAdminMock.from).toHaveBeenCalledTimes(3);
  });
});

describe('PUT /api/order-items/:id', () => {
  function req(body: Record<string, unknown>) {
    return new NextRequest('http://localhost/api/order-items/item-1', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  it('returns 404 when the item does not exist', async () => {
    queueFrom({ data: null, error: null });

    const res = await updateItem(req({ quantity: 2 }), { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthorized for the item’s order', async () => {
    queueFrom({ data: { order_id: 'order-1', product_id: 'p1' }, error: null });
    canAccessOrderMock.mockResolvedValue(false);

    const res = await updateItem(req({ quantity: 2 }), { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects updates on a non-pending order', async () => {
    queueFrom({ data: { order_id: 'order-1', product_id: 'p1' }, error: null });
    queueFrom({ data: { status: 'confirmed' }, error: null });

    const res = await updateItem(req({ quantity: 2 }), { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid quantity', async () => {
    queueFrom({ data: { order_id: 'order-1', product_id: 'p1' }, error: null });
    queueFrom({ data: { status: 'pending' }, error: null });

    const res = await updateItem(req({ quantity: -1 }), { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(400);
  });

  it('updates quantity, re-derives price from the product, and recalculates totals', async () => {
    queueFrom({ data: { order_id: 'order-1', product_id: 'p1' }, error: null });
    queueFrom({ data: { status: 'pending' }, error: null });
    queueFrom({ data: { price: 50 }, error: null });
    queueFrom({ data: { id: 'item-1', quantity: 3, total_price: 150 }, error: null }); // update result

    const res = await updateItem(req({ quantity: 3 }), { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.total_price).toBe(150);
    expect(recalculateOrderTotalsMock).toHaveBeenCalledWith('order-1');

    const updateChain = supabaseAdminMock.from.mock.results[3].value;
    expect(updateChain.update).toHaveBeenCalledWith({
      quantity: 3,
      options: undefined,
      unit_price: 50,
      total_price: 150,
    });
  });
});

describe('DELETE /api/order-items/:id', () => {
  it('returns 404 when the item does not exist', async () => {
    queueFrom({ data: null, error: null });

    const req = new NextRequest('http://localhost/api/order-items/item-1', { method: 'DELETE' });
    const res = await deleteItem(req, { params: Promise.resolve({ id: 'item-1' }) });

    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthorized', async () => {
    queueFrom({ data: { order_id: 'order-1' }, error: null });
    canAccessOrderMock.mockResolvedValue(false);

    const req = new NextRequest('http://localhost/api/order-items/item-1', { method: 'DELETE' });
    const res = await deleteItem(req, { params: Promise.resolve({ id: 'item-1' }) });

    expect(res.status).toBe(401);
  });

  it('rejects deleting from a non-pending order', async () => {
    queueFrom({ data: { order_id: 'order-1' }, error: null });
    queueFrom({ data: { status: 'delivered' }, error: null });

    const req = new NextRequest('http://localhost/api/order-items/item-1', { method: 'DELETE' });
    const res = await deleteItem(req, { params: Promise.resolve({ id: 'item-1' }) });

    expect(res.status).toBe(400);
  });

  it('deletes the item and recalculates totals', async () => {
    queueFrom({ data: { order_id: 'order-1' }, error: null });
    queueFrom({ data: { status: 'pending' }, error: null });
    queueFrom({ data: null, error: null }); // delete

    const req = new NextRequest('http://localhost/api/order-items/item-1', { method: 'DELETE' });
    const res = await deleteItem(req, { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe('Order item deleted');
    expect(recalculateOrderTotalsMock).toHaveBeenCalledWith('order-1');
  });
});