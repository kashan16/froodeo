'use client';

import { ActionButton } from '@/components/ui/action-button';
import { AnimatedMinus, AnimatedPlus } from '@/components/ui/animted-icons';
import { useValidateCoupon } from '@/hooks/useCoupon';
import { useCreateOrder } from '@/hooks/useOrders';
import { useRazorpayPayment } from '@/hooks/useRazorpayPayment';
import { useCart } from '@/lib/cart-context';
import { simulateDelay } from '@/lib/simulate-display';
import { ChevronDown, Clock, MapPin, Tag, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const DELIVERY_CHARGE_THRESHOLD = 500;
const DELIVERY_CHARGE = 40;

type PaymentMethod = 'online' | 'cod';

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-orange-500">{icon}</span>
        <h2 className="text-sm font-semibold text-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();
  const { initializePayment, isLoading: paymentLoading, error: paymentError } = useRazorpayPayment();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Generated once per mount and reused across retries within this
  // checkout session, so a double-tap or a retry-after-network-error
  // reuses the same idempotency_key instead of creating a duplicate order.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const deliveryCharge = subtotal >= DELIVERY_CHARGE_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + deliveryCharge - couponDiscount);
  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0 && !orderId) {
    return (
      <div className="px-4 py-24 text-center text-black/60">
        Your cart is empty.
        <div className="mt-4 max-w-xs mx-auto">
          <ActionButton
            onAction={async () => {
              await simulateDelay(500);
              router.push('/menu');
            }}
            idleLabel="Browse Menu"
            loadingLabel="Redirecting..."
            successTitle="Heading to menu"
          />
        </div>
      </div>
    );
  }

  const validate = () => {
    if (!name.trim()) return 'Please enter your name';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) return 'Please enter a valid 10-digit phone number';
    if (!address.trim()) return 'Please enter a delivery address';
    if (!/^\d{6}$/.test(pincode.trim())) return 'Please enter a valid 6-digit pincode';
    return null;
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!couponCode.trim()) return;
    try {
      const result = await validateCoupon.mutateAsync({ code: couponCode.trim(), subtotal });
      setAppliedCoupon({ code: result.coupon.code, discountAmount: result.discountAmount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handlePlaceOrder = async () => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      throw new Error(validationError);
    }
    setFormError(null);
    setPlacing(true);

    try {
      const { data: order } = await createOrder.mutateAsync({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        delivery_address: address.trim(),
        delivery_pincode: pincode.trim(),
        delivery_date: deliveryDate || undefined,
        delivery_time: deliveryTime || undefined,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
        idempotency_key: idempotencyKeyRef.current,
      });

      setOrderId(order.id);

      if (paymentMethod === 'online') {
        await initializePayment({
          orderId: order.id,
          userPhone: phone,
          userName: name,
        });
      }

      clearCart();
      router.push(`/order-confirmation/${order.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setFormError(message);
      throw err;
    } finally {
      setPlacing(false);
    }
  };

  const isBusy = createOrder.isPending || placing || (paymentMethod === 'online' && paymentLoading);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 pb-32">
      <h1 className="text-2xl font-bold text-black mb-6">Checkout</h1>

      <div className="space-y-4">
        <SectionCard icon={<MapPin size={16} />} title="Delivery Details">
          <div className="space-y-3">
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
            <input
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
            <input
              placeholder="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
            <input
              placeholder="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
          </div>
        </SectionCard>

        <SectionCard icon={<Clock size={16} />} title="Delivery Time">
          <div className="flex gap-3">
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="flex-1 h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
            <input
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="flex-1 h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <p className="text-xs text-black/50 mt-2">Leave blank to deliver as soon as possible</p>
        </SectionCard>

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 md:p-5"
          >
            <span className="text-sm font-semibold text-black">
              Order Summary · {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-black">₹{subtotal}</span>
              <ChevronDown
                size={16}
                className={`text-black/50 transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {summaryOpen && (
            <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-zinc-100 pt-3">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between text-sm py-2 border-b border-zinc-100 last:border-b-0"
                >
                  <span className="flex-1">{item.name}</span>
                  <div className="flex items-center gap-1 border border-zinc-300 rounded-full mx-3 px-1 py-1">
                    <ActionButton
                      size="icon"
                      variant="outline"
                      idleLabel={<AnimatedMinus />}
                      toastVariant={item.quantity <= 1 ? 'error' : 'success'}
                      successTitle={item.quantity <= 1 ? 'Removed from cart' : 'Updated quantity'}
                      successDescription={item.quantity <= 1 ? item.name : undefined}
                      className="w-6 h-6 border-0 bg-transparent text-orange-500 hover:bg-orange-100"
                      onAction={async () => {
                        await simulateDelay();
                        updateQuantity(item.product_id, item.quantity - 1);
                      }}
                    />
                    <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                    <ActionButton
                      size="icon"
                      variant="outline"
                      idleLabel={<AnimatedPlus />}
                      successTitle="Updated quantity"
                      className="w-6 h-6 border-0 bg-transparent text-orange-500 hover:bg-orange-100"
                      onAction={async () => {
                        await simulateDelay();
                        updateQuantity(item.product_id, item.quantity + 1);
                      }}
                    />
                  </div>
                  <span className="w-16 text-right">₹{item.price * item.quantity}</span>
                  <ActionButton
                    size="icon"
                    variant="outline"
                    idleLabel={<AnimatedMinus className="rotate-45" />}
                    toastVariant="error"
                    successTitle="Removed from cart"
                    successDescription={item.name}
                    className="ml-2 w-6 h-6 border-0 bg-transparent text-red-500 hover:bg-red-50"
                    onAction={async () => {
                      await simulateDelay();
                      removeItem(item.product_id);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <SectionCard icon={<Tag size={16} />} title="Coupon">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-sm text-green-700 font-medium">
                {appliedCoupon.code} applied — −₹{appliedCoupon.discountAmount}
              </span>
              <button onClick={handleRemoveCoupon} className="text-xs text-red-600 underline">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="flex-1 h-11 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={validateCoupon.isPending || !couponCode.trim()}
                className="px-4 h-11 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
              >
                {validateCoupon.isPending ? 'Checking...' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}
        </SectionCard>

        <SectionCard icon={<Wallet size={16} />} title="Payment Method">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              className={`text-left border rounded-xl p-4 transition-colors ${
                paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="font-medium text-black text-sm">Cash on Delivery</div>
              <div className="text-xs text-black/60 mt-1">Pay when your order arrives</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('online')}
              className={`text-left border rounded-xl p-4 transition-colors ${
                paymentMethod === 'online' ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="font-medium text-black text-sm">Pay Online</div>
              <div className="text-xs text-black/60 mt-1">UPI, Card, Netbanking</div>
            </button>
          </div>
        </SectionCard>

        <SectionCard icon={<span className="text-sm">₹</span>} title="Bill Details">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-black/70">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-black/70">
              <span>Delivery fee</span>
              <span>{deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon discount</span>
                <span>−₹{couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-black pt-2 border-t border-zinc-200">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
        </SectionCard>

        {(formError || paymentError) && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {formError || paymentError}
            {orderId && paymentMethod === 'online' && (
              <div className="mt-2">
                <a href={`/orders/${orderId}/pay`} className="underline font-medium">
                  Your order is saved — complete payment here
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 md:static md:border-0 md:p-0 md:mt-6 md:bg-transparent">
        <div className="max-w-2xl mx-auto">
          <ActionButton
            onAction={handlePlaceOrder}
            disabled={items.length === 0 || isBusy}
            idleLabel={paymentMethod === 'cod' ? `Place Order — ₹${total} (COD)` : `Pay ₹${total}`}
            loadingLabel={paymentMethod === 'cod' ? 'Placing order...' : 'Processing payment...'}
            successTitle={paymentMethod === 'cod' ? 'Order placed!' : 'Payment successful!'}
            successDescription="We'll notify you once it's on the way."
            errorTitle="Couldn't place order"
          />
        </div>
      </div>
    </div>
  );
}