import { useState, useCallback } from 'react';
import { useCreatePayment, useVerifyPayment } from './usePayments';
import { useUpdateOrder } from './useOrders';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UseRazorpayPaymentProps {
  orderId: string;
  userId: string;
  amount: number;
  userEmail: string;
  userPhone: string;
}

export function useRazorpayPayment({
  orderId,
  userId,
  amount,
  userEmail,
  userPhone,
}: UseRazorpayPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrder = useUpdateOrder(orderId);
  const verifyPayment = useVerifyPayment('');

  const initializePayment = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Initialize payment on backend
      const initResponse = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, user_id: userId }),
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize payment');
      }

      const {
        razorpayKeyId,
        razorpayOrderId,
        paymentId,
      } = await initResponse.json();

      // Step 2: Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      script.onload = () => {
        // Step 3: Open Razorpay modal
        const options = {
          key: razorpayKeyId,
          amount: amount * 100, // amount in paise
          currency: 'INR',
          name: 'Your Store Name',
          description: `Order #${orderId}`,
          order_id: razorpayOrderId,
          prefill: {
            name: 'Customer Name', // Get from user context
            email: userEmail,
            contact: userPhone,
          },
          handler: async (response: any) => {
            await handlePaymentSuccess(response, paymentId);
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              setError('Payment cancelled');
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      };

      script.onerror = () => {
        setError('Failed to load Razorpay');
        setIsLoading(false);
      };

      document.body.appendChild(script);
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed');
      setIsLoading(false);
    }
  }, [orderId, userId, amount, userEmail, userPhone]);

  const handlePaymentSuccess = useCallback(
    async (response: any, paymentId: string) => {
      try {
        // Verify payment signature on backend
        const verifyResponse = await fetch(`/api/payments/${paymentId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Payment verification failed');
        }

        const verifiedPayment = await verifyResponse.json();

        // Update order status
        await updateOrder.mutateAsync({
          status: 'confirmed',
        });

        setIsLoading(false);
        return verifiedPayment;
      } catch (err: any) {
        setError(err.message || 'Payment verification failed');
        setIsLoading(false);
      }
    },
    [orderId, updateOrder]
  );

  return {
    initializePayment,
    isLoading,
    error,
  };
}