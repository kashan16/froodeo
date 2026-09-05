'use client';

import { ActionButton } from '@/components/ui/action-button';
import { useOrder } from '@/hooks/useOrders';
import { useParams, useRouter } from 'next/navigation';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading, error } = useOrder(id);

  if (isLoading) {
    return <div className="px-4 py-24 text-center text-black/60">Loading your order...</div>;
  }

  if (error || !order) {
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
        <div>
          <span className="font-medium text-black">Delivering to:</span> {order.customer_name}, {order.customer_phone}
        </div>
        <div>{order.delivery_address}</div>
        {order.delivery_date && (
          <div>
            {order.delivery_date} {order.delivery_time ? `at ${order.delivery_time}` : ''}
          </div>
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