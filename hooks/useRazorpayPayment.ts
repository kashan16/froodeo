/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface InitializePaymentArgs {
  orderId: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
}

export function useRazorpayPayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRazorpayScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load payment gateway. Check your connection and try again.'));
      document.body.appendChild(script);
    });
  }, []);

  const verifyPayment = useCallback(
    async (
      paymentId: string,
      orderToken: string,
      razorpayResponse: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }
    ) => {
      const verifyResponse = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orderToken}`,
        },
        body: JSON.stringify(razorpayResponse),
      });

      const body = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) {
        throw new Error(body.error || 'Payment verification failed');
      }
      return body.data;
    },
    []
  );

  const initializePayment = useCallback(
    async ({ orderId, userEmail, userPhone, userName }: InitializePaymentArgs) => {
      setIsLoading(true);
      setError(null);

      try {
        const storedToken = sessionStorage.getItem(`order_token_${orderId}`);

        const initResponse = await fetch('/api/payments/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
          body: JSON.stringify({ order_id: orderId }),
        });

        const initData = await initResponse.json().catch(() => ({}));
        if (!initResponse.ok) {
          throw new Error(initData.error || 'Failed to initialize payment');
        }

        const { razorpayKeyId, razorpayOrderId, amount: paiseAmount, paymentId, orderToken } =
          initData;

        sessionStorage.setItem(`order_token_${orderId}`, orderToken);

        await loadRazorpayScript();

        return await new Promise((resolve, reject) => {
          const options = {
            key: razorpayKeyId,
            amount: paiseAmount,
            currency: 'INR',
            name: 'Froodeo',
            description: `Order #${orderId}`,
            order_id: razorpayOrderId,
            prefill: {
              name: userName,
              email: userEmail,
              contact: userPhone,
            },
            handler: async (response: any) => {
              try {
                const verified = await verifyPayment(paymentId, orderToken, response);
                setIsLoading(false);
                resolve(verified);
              } catch (err: any) {
                setError(err.message || 'Payment verification failed');
                setIsLoading(false);
                reject(err);
              }
            },
            modal: {
              ondismiss: () => {
                setIsLoading(false);
                setError('Payment cancelled');
                reject(new Error('Payment cancelled'));
              },
            },
          };

          const razorpay = new window.Razorpay(options);
          razorpay.open();
        });
      } catch (err: any) {
        setError(err.message || 'Payment initialization failed');
        setIsLoading(false);
        throw err;
      }
    },
    [loadRazorpayScript, verifyPayment]
  );

  return {
    initializePayment,
    isLoading,
    error,
  };
}