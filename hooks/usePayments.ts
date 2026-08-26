import { Payment } from '@/app/api/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


const API_URL = '/api/payments';

interface PaymentFilters {
  order_id?: string;
}

const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: PaymentFilters) =>
    [...paymentKeys.lists(), { ...filters }] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

// Fetch all payments with filters
export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters ?? {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.order_id) params.append('order_id', filters.order_id);

      const url = `${API_URL}${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch payments');
      const json = await res.json();
      return json.data as Payment[];
    },
  });
}

// Fetch single payment
export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`${API_URL}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch payment');
      const json = await res.json();
      return json.data as Payment;
    },
    enabled: !!id,
  });
}

interface CreatePaymentPayload {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency?: string;
  status?: string;
}

// Create payment record
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreatePaymentPayload) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create payment');
      const json = await res.json();
      return json.data as Payment;
    },
    onSuccess: (newPayment) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.setQueryData(paymentKeys.detail(newPayment.id), newPayment);
      // Also invalidate order detail to reflect payment
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', newPayment.order_id] });
    },
  });
}

interface UpdatePaymentPayload {
  status?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  method?: string;
}

// Verify/update payment (after Razorpay callback)
export function useVerifyPayment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdatePaymentPayload) => {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to verify payment');
      const json = await res.json();
      return json.data as Payment;
    },
    onSuccess: (updatedPayment) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.setQueryData(paymentKeys.detail(id), updatedPayment);
      // Invalidate related order
      queryClient.invalidateQueries({
        queryKey: ['orders', 'detail', updatedPayment.order_id],
      });
    },
  });
}

// Delete payment
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete payment');
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.removeQueries({ queryKey: paymentKeys.detail(id) });
    },
  });
}