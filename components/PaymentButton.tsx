'use client';

import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';
import { useState } from 'react';

interface PaymentButtonProps {
  orderId: string;
  userId: string;
  amount: number;
  userEmail: string;
  userPhone: string;
}

export function PaymentButton({
  orderId,
  userId,
  amount,
  userEmail,
  userPhone,
}: PaymentButtonProps) {
  const [hasAttempted, setHasAttempted] = useState(false);
  const { initializePayment, isLoading, error } = useRazorpayPayment({
    orderId,
    userId,
    amount,
    userEmail,
    userPhone,
  });

  const handleClick = async () => {
    setHasAttempted(true);
    await initializePayment();
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : `Pay ₹${amount}`}
      </button>

      {error && hasAttempted && (
        <div className="mt-2 p-3 bg-red-100 text-red-700 rounded">
          {error}
          <button
            onClick={handleClick}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}