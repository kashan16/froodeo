import { OrderItem } from '@/app/api/types';
import { orderScopedFetch } from '@/lib/orderFetch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const BASE_URL = '/api/orders';

const orderItemKeys = {
  all: ['orderItems'] as const,
  byOrder: (orderId: string) => [...orderItemKeys.all, 'byOrder', orderId] as const,
};

async function parseOrThrow(res: Response, fallback: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || fallback);
  return json;
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: orderItemKeys.byOrder(orderId),
    queryFn: async () => {
      const res = await orderScopedFetch(orderId, `${BASE_URL}/${orderId}/items`);
      const json = await parseOrThrow(res, 'Failed to fetch order items');
      return json.data as OrderItem[];
    },
    enabled: !!orderId,
  });
}

interface AddOrderItemPayload {
  product_id: string;
  quantity: number;
  options?: Record<string, unknown>;
  // unit_price removed — the server looks it up from `products`, a
  // client-supplied price is no longer accepted (and would be ignored
  // even if sent).
}

export function useAddOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AddOrderItemPayload) => {
      const res = await orderScopedFetch(orderId, `${BASE_URL}/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await parseOrThrow(res, 'Failed to add order item');
      return json.data as OrderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItemKeys.byOrder(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] }); // totals changed
    },
  });
}

interface UpdateOrderItemPayload {
  quantity: number;
  options?: Record<string, unknown>;
}

// orderId is now required — the route (PUT /api/order-items/:id) has no
// order_id in its URL, and the client needs to know which order this item
// belongs to in order to pick the right auth token to send.
export function useUpdateOrderItem(itemId: string, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateOrderItemPayload) => {
      const res = await orderScopedFetch(orderId, `/api/order-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const json = await parseOrThrow(res, 'Failed to update order item');
      return json.data as OrderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItemKeys.byOrder(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] });
    },
  });
}

export function useDeleteOrderItem(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await orderScopedFetch(orderId, `/api/order-items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete order item');
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItemKeys.byOrder(orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] });
    },
  });
}