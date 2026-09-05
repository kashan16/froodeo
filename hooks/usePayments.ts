import { Payment } from '@/app/api/types';
import { orderScopedFetch } from '@/lib/orderFetch';
import { useQuery } from '@tanstack/react-query';

const API_URL = '/api/payments';

const paymentKeys = {
  all: ['payments'] as const,
  byOrder: (orderId: string) => [...paymentKeys.all, 'byOrder', orderId] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
};

async function parseOrThrow(res: Response, fallback: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || fallback);
  return json;
}

// Payments are always scoped to one order — there's no "list all my
// payments across orders" endpoint, so this takes orderId directly
// instead of a generic filters object.
export function usePayments(orderId: string) {
  return useQuery({
    queryKey: paymentKeys.byOrder(orderId),
    queryFn: async () => {
      const res = await orderScopedFetch(orderId, `${API_URL}?order_id=${orderId}`);
      const json = await parseOrThrow(res, 'Failed to fetch payments');
      return json.data as Payment[];
    },
    enabled: !!orderId,
  });
}

export function usePayment(id: string, orderId: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: async () => {
      const res = await orderScopedFetch(orderId, `${API_URL}/${id}`);
      const json = await parseOrThrow(res, 'Failed to fetch payment');
      return json.data as Payment;
    },
    enabled: !!id && !!orderId,
  });
}

// useCreatePayment removed — POST /api/payments is intentionally disabled
// (405). Payments can only be created through /api/payments/init, which
// is what useRazorpayPayment already calls.
//
// useVerifyPayment removed — there is no PUT /api/payments/:id. Verification
// happens at POST /api/payments/:id/verify, already implemented correctly
// inside useRazorpayPayment's verifyPayment() function — use that instead
// of a separate hook.
//
// useDeletePayment removed — no DELETE route exists for payments, and
// there's no legitimate product reason for a client to delete a payment
// record.