'use client';

import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface CouponContextValue {
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clearCoupon: () => void;
}

const CouponContext = createContext<CouponContextValue | undefined>(undefined);

export function CouponProvider({ children }: { children: ReactNode }) {
  const [appliedCoupon, setAppliedCouponState] = useState<AppliedCoupon | null>(null);

  const setAppliedCoupon = useCallback((coupon: AppliedCoupon | null) => {
    setAppliedCouponState(coupon);
  }, []);

  const clearCoupon = useCallback(() => {
    setAppliedCouponState(null);
  }, []);

  return (
    <CouponContext.Provider value={{ appliedCoupon, setAppliedCoupon, clearCoupon }}>
      {children}
    </CouponContext.Provider>
  );
}

export function useCouponContext() {
  const ctx = useContext(CouponContext);
  if (!ctx) throw new Error('useCouponContext must be used within a CouponProvider');
  return ctx;
}