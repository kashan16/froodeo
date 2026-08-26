'use client';

import Link from "next/link";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "./ui/product-card";

export const BestSeller = () => {
  const { data: products, isLoading, error } = useProducts({ featured: true, available: true });

  if (isLoading) {
    return (
      <section className="w-full px-4 py-6 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-4">Best Sellers</h2>
        <div className="flex gap-4 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="min-w-[70%] sm:min-w-0 sm:w-full aspect-square bg-zinc-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !products || products.length === 0) return null;

  return (
    <section className="w-full px-4 py-6 md:px-8">
      <div className="flex flex-row items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-black">Best Sellers</h2>
        <Link
          href="/menu"
          className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
        >
          View All
        </Link>
      </div>

      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-hide pb-2">
        {products.slice(0, 8).map((product) => (
          <div key={product.id} className="min-w-[85%] xs:min-w-[70%] sm:min-w-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};