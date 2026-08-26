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
  payment_method?: 'online' | 'cod';
}

interface CreateOrderResponse {
  data: Order;
  orderToken: string;
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
      return json as CreateOrderResponse;
    },
    onSuccess: ({ data: newOrder, orderToken }) => {
      queryClient.setQueryData(orderKeys.detail(newOrder.id), newOrder);
      // Store the token right away so the confirmation page can fetch the
      // order even for COD, which never touches /api/payments/init.
      sessionStorage.setItem(`order_token_${newOrder.id}`, orderToken);
    },
  });
}

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