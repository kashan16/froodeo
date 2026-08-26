'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateOrder } from '@/hooks/useOrders';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';
import { useCart } from '@/lib/cart-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const DELIVERY_CHARGE_THRESHOLD = 500;
const DELIVERY_CHARGE = 40;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const { initializePayment, isLoading: paymentLoading, error: paymentError } =
    useRazorpayPayment();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const deliveryCharge = subtotal >= DELIVERY_CHARGE_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const total = subtotal + deliveryCharge;

  if (items.length === 0 && !orderId) {
    return (
      <div className="px-4 py-24 text-center text-black/60">
        Your cart is empty.
        <div className="mt-4">
          <Button onClick={() => router.push('/menu')} className="bg-orange-500 text-white">
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  const validate = () => {
    if (!name.trim()) return 'Please enter your name';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) return 'Please enter a valid 10-digit phone number';
    if (!address.trim()) return 'Please enter a delivery address';
    return null;
  };

  const handlePlaceOrder = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);

    try {
      // Step 1: create the order server-side (price is recalculated there
      // from the DB, not trusted from this cart state)
      const order = await createOrder.mutateAsync({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        delivery_address: address.trim(),
        delivery_date: deliveryDate || undefined,
        delivery_time: deliveryTime || undefined,
      });

      setOrderId(order.id);

      // Step 2: hand off to Razorpay via the shared hook — no duplicated
      // checkout-loading logic here anymore.
      await initializePayment({
        orderId: order.id,
        amount: order.total,
        userPhone: phone,
        userName: name,
      });

      clearCart();
      router.push(`/order-confirmation/${order.id}`);
    } catch (err) {
      // initializePayment already sets its own `error` state for payment
      // failures/cancellation; this catch covers order-creation failures
      // and re-thrown payment errors so the button re-enables either way.
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setFormError(message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-black mb-6">Checkout</h1>

      <div className="bg-zinc-50 rounded-xl p-4 mb-6">
        {items.map((item) => (
          <div key={item.product_id} className="flex justify-between text-sm py-1">
            <span>{item.name} × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t border-zinc-200 mt-2 pt-2 flex justify-between text-sm">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        <div className="flex justify-between text-sm text-black/60">
          <span>Delivery</span>
          <span>{deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}</span>
        </div>
        <div className="flex justify-between font-bold mt-2 pt-2 border-t border-zinc-200">
          <span>Total</span>
          <span>₹{total}</span>
        </div>
      </div>

      <div className="space-y-4">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        />
        <Input
          placeholder="Delivery address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="flex gap-3">
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          <Input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
        </div>
      </div>

      {(formError || paymentError) && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {formError || paymentError}
        </div>
      )}

      <Button
        onClick={handlePlaceOrder}
        isDisabled={createOrder.isPending || paymentLoading}
        className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12"
      >
        {createOrder.isPending ? 'Placing order...' : paymentLoading ? 'Processing...' : `Pay ₹${total}`}
      </Button>
    </div>
  );
}