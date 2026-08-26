'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Plus } from 'lucide-react';
import { Product } from '@/app/api/types';
import { useCart } from '@/lib/cart-context';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.product_id === product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
  };

  return (
    <Link href={`/product/${product.id}`} className="block h-full">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
        <div className="relative w-full aspect-square bg-zinc-100">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-black/30 text-sm">
              No image
            </div>
          )}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">Sold Out</span>
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col flex-1">
          <h3 className="text-sm font-semibold text-black line-clamp-2">{product.name}</h3>

          {product.rating > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-black/60">
              <Star size={12} className="fill-orange-500 text-orange-500" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="font-bold text-black">₹{product.price}</span>

            {product.is_available &&
              (cartItem ? (
                <div
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center gap-2 bg-orange-50 rounded-full px-1"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateQuantity(product.id, cartItem.quantity - 1);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-orange-500 font-bold"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-4 text-center">{cartItem.quantity}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateQuantity(product.id, cartItem.quantity + 1);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-orange-500 font-bold"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <Plus size={16} />
                </button>
              ))}
          </div>
        </div>
      </div>
    </Link>
  );
}