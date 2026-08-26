import crypto from 'crypto';

export const razorpayInstance = {
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
};

// Verify Razorpay signature
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const message = `${orderId}|${paymentId}`;
  const hmac = crypto
    .createHmac('sha256', razorpayInstance.keySecret || '')
    .update(message)
    .digest('hex');

  return hmac === signature;
}

// Create Razorpay order via API
export async function createRazorpayOrder(amount: number, receipt: string) {
  const options = {
    amount: amount * 100, // amount in paise
    currency: 'INR',
    receipt,
  };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${razorpayInstance.keyId}:${razorpayInstance.keySecret}`
      ).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error('Failed to create Razorpay order');
  }

  return response.json();
}