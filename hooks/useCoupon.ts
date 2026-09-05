import { apiFetch } from '@/context/AuthContext';
import { useMutation } from '@tanstack/react-query';

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

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, subtotal }: { code: string; subtotal: number }) => {
      const res = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Invalid coupon');
      return json.data as CouponPreview;
    },
  });
}