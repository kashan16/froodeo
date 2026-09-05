import { Order, OrderWithItems } from '@/app/api/types';
import { apiFetch } from '@/context/AuthContext';
import { orderScopedFetch } from '@/lib/orderFetch';
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
  delivery_pincode: string;
  delivery_date?: string;
  delivery_time?: string;
  payment_method?: 'online' | 'cod';
  coupon_code?: string;
  idempotency_key: string;
}

interface CreateOrderResponse {
  data: Order;
  orderToken: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateOrderPayload) => {
      const res = await apiFetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create order');
      return json as CreateOrderResponse;
    },
    onSuccess: ({ data: newOrder, orderToken }) => {
      queryClient.setQueryData(orderKeys.detail(newOrder.id), newOrder);
      sessionStorage.setItem(`order_token_${newOrder.id}`, orderToken);
    },
  });
}

// Returns OrderWithItems, not plain Order — GET /api/orders/:id always
// joins order_items(*, products(name, image_url)) into its response.
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const res = await orderScopedFetch(id, `${API_URL}/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch order');
      return json.data as OrderWithItems;
    },
    enabled: !!id,
  });
}