'use client';

import { ActionButton } from '@/components/ui/action-button';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: { name: string; image_url: string | null } | null;
}

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total: number;
  delivery_address: string;
  delivery_date: string | null;
  delivery_time: string | null;
  customer_name: string;
  customer_phone: string;
  order_items: OrderItem[];
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem(`order_token_${id}`);
    if (!token) {
      // No token for this order in this browser session — either it's
      // not this device's order, or the session was cleared. We can't
      // show order details without it (that's the point of the token
      // gate), so send them somewhere useful instead of a blank error.
      setError('no-token');
      setLoading(false);
      return;
    }

    fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load order');
        setOrder(body.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="px-4 py-24 text-center text-black/60">Loading your order...</div>;
  }

  if (error === 'no-token') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-black mb-2">Order details unavailable</h1>
        <p className="text-black/60 mb-6">
          We can&apos;t find this order in your current session. If you just placed it, check the
          confirmation SMS/email. Otherwise, this link may have been opened on a different device.
        </p>
        <ActionButton
          onAction={async () => {
            router.push('/menu');
          }}
          idleLabel="Back to Menu"
          loadingLabel="Redirecting..."
          successTitle="Heading to menu"
          className="max-w-xs mx-auto"
        />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="px-4 py-24 text-center text-black/60">
        {error || 'Order not found.'}
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: 'Payment Pending',
    confirmed: 'Confirmed',
    preparing: 'Being Prepared',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-black">Order Placed!</h1>
        <p className="text-black/60 mt-1">
          Order #{order.id.slice(0, 8).toUpperCase()} — {statusLabels[order.status] ?? order.status}
        </p>
      </div>

      <div className="bg-zinc-50 rounded-xl p-4 mb-6">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span>
              {item.products?.name ?? 'Item'} × {item.quantity}
            </span>
            <span>₹{item.total_price}</span>
          </div>
        ))}
        <div className="border-t border-zinc-200 mt-2 pt-2 flex justify-between text-sm">
          <span>Subtotal</span>
          <span>₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-black/60">
          <span>Delivery</span>
          <span>{order.delivery_charge === 0 ? 'Free' : `₹${order.delivery_charge}`}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>−₹{order.discount}</span>
          </div>
        )}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-zinc-200">
          <span>Total</span>
          <span>₹{order.total}</span>
        </div>
      </div>

      <div className="text-sm text-black/70 space-y-1 mb-8">
        <div><span className="font-medium text-black">Delivering to:</span> {order.customer_name}, {order.customer_phone}</div>
        <div>{order.delivery_address}</div>
        {order.delivery_date && (
          <div>{order.delivery_date} {order.delivery_time ? `at ${order.delivery_time}` : ''}</div>
        )}
      </div>

      <ActionButton
        onAction={async () => {
          router.push('/menu');
        }}
        idleLabel="Order More"
        loadingLabel="Redirecting..."
        successTitle="Heading to menu"
      />
    </div>
  );
}