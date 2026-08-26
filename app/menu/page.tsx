'use client';

import { useState } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ui/product-card";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { data: categories } = useCategories();
  const { data: products, isLoading, error } = useProducts({
    category_id: selectedCategory,
    available: true,
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <Navbar />

      <div className="max-w-6xl mx-auto w-full px-4 pt-24 pb-8 flex-1">
        <h1 className="text-2xl font-bold text-black mb-6">Our Menu</h1>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory ? 'bg-orange-500 text-white' : 'bg-white text-black/70 hover:bg-zinc-100'
            }`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-black/70 hover:bg-zinc-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-red-600">
            Failed to load menu. Please try again.
          </div>
        )}

        {!isLoading && !error && (!products || products.length === 0) && (
          <div className="text-center py-12 text-black/60">No items found in this category.</div>
        )}

        {!isLoading && products && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}