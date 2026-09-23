'use client';

import { BrowsableCoupon, useCoupons } from '@/hooks/useCoupon';
import { Loader2, Tag, TicketX, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function CouponModal({
  open,
  onOpenChange,
  subtotal,
  onSelectCode,
  applying,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  onSelectCode: (code: string) => void;
  applying: boolean;
}) {
  const { data: coupons, isLoading, error } = useCoupons();
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const describeDiscount = (c: BrowsableCoupon) =>
    c.discount_type === 'flat'
      ? `Flat ₹${c.discount_value} off`
      : `${c.discount_value}% off${c.max_discount_amount ? ` (up to ₹${c.max_discount_amount})` : ''}`;

  const isEligible = (c: BrowsableCoupon) => subtotal >= c.min_order_value;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[85vh] sm:max-h-[32rem] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-black">Apply Coupon</h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-black/40 hover:bg-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Manual entry */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="flex-1 h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
            <button
              onClick={() => manualCode.trim() && onSelectCode(manualCode.trim())}
              disabled={!manualCode.trim() || applying}
              className="px-4 h-11 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
            >
              {applying ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>

        <div className="px-5 py-2 shrink-0">
          <p className="text-xs font-medium uppercase tracking-wide text-black/40">Available coupons</p>
        </div>

        {/* Browsable list */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 py-10 text-black/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Loading coupons...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 py-10 text-red-500">
              <p className="text-sm">Couldn&apos;t load coupons</p>
            </div>
          )}

          {!isLoading && !error && (!coupons || coupons.length === 0) && (
            <div className="flex flex-col items-center gap-2 py-10 text-black/40">
              <TicketX className="h-6 w-6" />
              <p className="text-sm">No coupons available right now</p>
            </div>
          )}

          <div className="space-y-2">
            {coupons?.map((c) => {
              const eligible = isEligible(c);
              return (
                <div
                  key={c.code}
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                    eligible ? 'border-orange-200 bg-orange-50' : 'border-zinc-200 bg-zinc-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Tag size={16} className={`mt-0.5 shrink-0 ${eligible ? 'text-orange-500' : 'text-zinc-400'}`} />
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-sm text-black truncate">{c.code}</p>
                      <p className="text-xs text-black/60">{describeDiscount(c)}</p>
                      {!eligible && (
                        <p className="text-xs text-red-500 mt-0.5">Min. order ₹{c.min_order_value}</p>
                      )}
                      {c.valid_until && (
                        <p className="text-[11px] text-black/40 mt-0.5">
                          Valid till {new Date(c.valid_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectCode(c.code)}
                    disabled={!eligible || applying}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}