import { Order } from '@/app/api/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_URL = '/api/orders';

const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  items: Array<{ product_id: string; quantity: number }>;
  delivery_address: string;
  delivery_date?: string;
  delivery_time?: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateOrderPayload) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create order');
      return json.data as Order;
    },
    onSuccess: (newOrder) => {
      queryClient.setQueryData(orderKeys.detail(newOrder.id), newOrder);
    },
  });
}

// Fetch single order — needs the order token once checkout is underway,
// since there's no public order-listing/lookup without one.
export function useOrder(id: string, orderToken?: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/${id}`, {
        headers: orderToken ? { Authorization: `Bearer ${orderToken}` } : {},
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch order');
      return json.data as Order;
    },
    enabled: !!id,
  });
}