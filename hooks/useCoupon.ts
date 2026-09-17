import { apiFetch } from '@/context/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';

export interface BrowsableCoupon {
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  valid_until: string | null;
}

interface CouponPreview {
  coupon: {
    id: string;
    code: string;
    discount_type: 'flat' | 'percentage';
    discount_value: number;
    max_discount_amount: number | null;
  };
  discountAmount: number;
}

// Public list for the "browse coupons" modal.
export function useCoupons() {
  return useQuery({
    queryKey: ['coupons', 'public'],
    queryFn: async () => {
      const res = await fetch('/api/coupons');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch coupons');
      return json.data as BrowsableCoupon[];
    },
    staleTime: 60_000,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, subtotal, phone }: { code: string; subtotal: number; phone: string }) => {
      const res = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal, phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Invalid coupon');
      return json.data as CouponPreview;
    },
  });
}