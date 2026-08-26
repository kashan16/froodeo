import { Order } from '@/app/api/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


const API_URL = '/api/orders';

interface OrderFilters {
  user_id?: string;
  status?: string;
}

const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) =>
    [...orderKeys.lists(), { ...filters }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Fetch all orders with filters
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters ?? {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.user_id) params.append('user_id', filters.user_id);
      if (filters?.status) params.append('status', filters.status);

      const url = `${API_URL}${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();
      return json.data as Order[];
    },
  });
}

// Fetch single order
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const json = await res.json();
      return json.data as Order;
    },
    enabled: !!id,
  });
}

interface CreateOrderPayload {
  user_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    options?: Record<string, any>;
  }>;
  delivery_address: string;
  delivery_date?: string;
  delivery_time?: string;
  discount?: number;
  delivery_charge?: number;
}

// Create order with items
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateOrderPayload) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create order');
      const json = await res.json();
      return json.data as Order;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.setQueryData(orderKeys.detail(newOrder.id), newOrder);
    },
  });
}

// Update order (status, delivery info, etc.)
export function useUpdateOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Partial<Order>) => {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update order');
      const json = await res.json();
      return json.data as Order;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.setQueryData(orderKeys.detail(id), updatedOrder);
    },
  });
}

// Delete order
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete order');
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}