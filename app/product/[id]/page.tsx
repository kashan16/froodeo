'use client';

import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/lib/cart-context';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, error } = useProduct(id);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <Navbar />
      <div className="flex-1 pt-20">{children}</div>
      <Footer />
    </div>
  );

  if (isLoading) {
    return <Wrapper><div className="px-4 py-24 text-center text-black/60">Loading...</div></Wrapper>;
  }

  if (error || !product) {
    return (
      <Wrapper>
        <div className="px-4 py-24 text-center text-black/60">Couldn&apos;t find that product.</div>
      </Wrapper>
    );
  }

  const handleAddToCart = () => {
    addItem(
      {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  return (
    <Wrapper>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 mb-6">
          {product.image_url && (
            <Image src={product.image_url} alt={product.name} fill className="object-cover"  unoptimized/>
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

        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center border border-zinc-300 rounded-full">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-lg"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button
            onClick={handleAddToCart}
            disabled={!product.is_available}
            className="flex-1 border border-orange-500 text-orange-500 hover:bg-orange-50 rounded-full h-12 disabled:opacity-50"
          >
            {added ? 'Added ✓' : 'Add to Cart'}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!product.is_available}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </Wrapper>
  );
}