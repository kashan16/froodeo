'use client';

import { ActionButton } from '@/components/ui/action-button';
import { AnimatedMinus, AnimatedPlus } from '@/components/ui/animted-icons';
import { useCheckPincode } from '@/hooks/usePincodes';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/lib/cart-context';
import { simulateDelay } from '@/lib/simulate-display';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const PINCODE_STORAGE_KEY = 'froodeo_checked_pincode';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, error } = useProduct(id);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const [pincode, setPincode] = useState('');
  const [serviceable, setServiceable] = useState<boolean | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const checkPincode = useCheckPincode();

  // Remember the last confirmed pincode for this browser so returning
  // visitors don't have to re-enter it on every product page.
  useState(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(PINCODE_STORAGE_KEY);
    if (stored) setPincode(stored);
  });

  if (isLoading) {
    return <div className="px-4 py-24 text-center text-black/60">Loading...</div>;
  }

  if (error || !product) {
    return <div className="px-4 py-24 text-center text-black/60">Couldn&apos;t find that product.</div>;
  }

  const handleCheckPincode = async () => {
    setPincodeError(null);
    if (!/^\d{6}$/.test(pincode.trim())) {
      setPincodeError('Enter a valid 6-digit pincode');
      setServiceable(null);
      return;
    }
    try {
      const result = await checkPincode.mutateAsync(pincode.trim());
      setServiceable(result.serviceable);
      setAreaName(result.area_name);
      if (result.serviceable) {
        localStorage.setItem(PINCODE_STORAGE_KEY, pincode.trim());
      } else {
        setPincodeError("Sorry, we don't deliver to this area yet");
      }
    } catch (err) {
      setServiceable(null);
      setPincodeError(err instanceof Error ? err.message : 'Failed to check pincode');
    }
  };

  const canOrder = product.is_available && serviceable === true;

  const addToCart = async () => {
    await simulateDelay();
    addItem(
      {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      },
      quantity
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 mb-6">
        {product.image_url && (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" unoptimized />
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold">Currently Unavailable</span>
          </div>
        )}
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-black">{product.name}</h1>

      {product.rating > 0 && (
        <div className="flex items-center gap-1 mt-2 text-sm text-black/60">
          <span className="text-orange-500 font-semibold">★ {product.rating.toFixed(1)}</span>
        </div>
      )}

      {product.description && (
        <p className="text-black/70 mt-4 leading-relaxed">{product.description}</p>
      )}

      <div className="text-2xl font-bold text-black mt-6">₹{product.price}</div>

      {/* Delivery pincode check */}
      <div className="mt-6 border border-zinc-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-black">
          <MapPin size={16} className="text-orange-500" />
          Check delivery availability
        </div>
        <div className="flex gap-2">
          <input
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setServiceable(null);
            }}
            placeholder="Enter pincode"
            className="flex-1 h-10 px-3 rounded-lg border border-zinc-200 text-sm outline-none focus:border-orange-400"
          />
          <button
            onClick={handleCheckPincode}
            disabled={checkPincode.isPending}
            className="px-4 h-10 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
          >
            {checkPincode.isPending ? 'Checking...' : 'Check'}
          </button>
        </div>
        {serviceable === true && (
          <p className="text-xs text-green-600 mt-2">
            Delivering to {areaName ?? 'your area'} ✓
          </p>
        )}
        {pincodeError && <p className="text-xs text-red-600 mt-2">{pincodeError}</p>}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <div className="flex items-center border border-zinc-300 rounded-full text-black/80">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center"
            aria-label="Decrease quantity"
          >
            <AnimatedMinus />
          </button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-10 h-10 flex items-center justify-center"
            aria-label="Increase quantity"
          >
            <AnimatedPlus />
          </button>
        </div>
      </div>

      <div className="flex flex-row gap-3 mt-8">
        <ActionButton
          onAction={addToCart}
          disabled={!canOrder}
          idleLabel="Add to Cart"
          loadingLabel="Adding..."
          successTitle="Added to cart"
          successDescription={`${quantity} × ${product.name}`}
          variant="outline"
          className="flex-1 h-12"
        />
        <ActionButton
          onAction={async () => {
            await addToCart();
            router.push('/checkout');
          }}
          disabled={!canOrder}
          idleLabel="Buy Now"
          loadingLabel="Adding..."
          successTitle="Added to cart"
          successDescription="Redirecting to checkout..."
          className="flex-1 h-12"
        />
      </div>
      {!canOrder && product.is_available && serviceable === null && (
        <p className="text-xs text-black/50 mt-2 text-center">
          Check your delivery pincode above to enable ordering
        </p>
      )}
    </div>
  );
}