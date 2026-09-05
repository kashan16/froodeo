'use client';

import { useOrder } from '@/hooks/useOrders';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResumePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading, error } = useOrder(id);
  const { initializePayment, isLoading: paymentLoading, error: paymentError } = useRazorpayPayment();
  const [localError, setLocalError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="px-4 py-24 text-center text-black/60">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="px-4 py-24 text-center text-black/60">
        We can&apos;t find this order in your current session.
      </div>
    );
  }

  if (order.status !== 'pending') {
    return (
      <div className="px-4 py-24 text-center text-black/60">
        This order is already {order.status} — nothing to pay.
      </div>
    );
  }

  const handlePay = async () => {
    setLocalError(null);
    try {
      await initializePayment({
        orderId: order.id,
        userPhone: order.customer_phone ?? undefined,
        userName: order.customer_name ?? undefined,
      });
      router.push(`/order-confirmation/${order.id}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="text-xl font-bold text-black mb-2">Complete Your Payment</h1>
      <p className="text-black/60 mb-6">
        Order #{order.id.slice(0, 8).toUpperCase()} — ₹{order.total}
      </p>

      {(localError || paymentError) && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {localError || paymentError}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={paymentLoading}
        className="w-full h-12 rounded-full bg-orange-500 text-white font-medium disabled:opacity-50"
      >
        {paymentLoading ? 'Processing...' : `Pay ₹${order.total}`}
      </button>
    </div>
  );
}