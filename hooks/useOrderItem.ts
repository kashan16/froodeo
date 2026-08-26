import { OrderItem } from '@/app/api/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE_URL = '/api/orders';

const orderItemKeys = {
  all: ['orderItems'] as const,
  byOrder: (orderId: string) =>
    [...orderItemKeys.all, 'byOrder', orderId] as const,
  detail: (id: string) => [...orderItemKeys.all, 'detail', id] as const,
};

// Fetch order items by order ID
export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: orderItemKeys.byOrder(orderId),
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/${orderId}/items`);
      if (!res.ok) throw new Error('Failed to fetch order items');
      const json = await res.json();
      return json.data as OrderItem[];
    },
    enabled: !!orderId,
  });
}

interface AddOrderItemPayload {
  product_id: string;
  quantity: number;
  unit_price: number;
  options?: Record<string, any>;
}

// Add item to order
export function useAddOrderItem(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: AddOrderItemPayload) => {
      const res = await fetch(`${BASE_URL}/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to add order item');
      const json = await res.json();
      return json.data as OrderItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderItemKeys.byOrder(orderId) });
    },
  });
}

// Update order item
export function useUpdateOrderItem(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Partial<OrderItem>) => {
      const res = await fetch(`/api/order-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update order item');
      const json = await res.json();
      return json.data as OrderItem;
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({
        queryKey: orderItemKeys.byOrder(updatedItem.order_id),
      });
      queryClient.setQueryData(orderItemKeys.detail(itemId), updatedItem);
    },
  });
}

// Delete order item
export function useDeleteOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/order-items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete order item');
      return itemId;
    },
    onSuccess: (itemId) => {
      queryClient.removeQueries({ queryKey: orderItemKeys.detail(itemId) });
      queryClient.invalidateQueries({ queryKey: orderItemKeys.all });
    },
  });
}