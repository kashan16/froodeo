'use client';

import { ProductCard } from "@/components/ui/product-card";
import { useCategory } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useParams } from "next/navigation";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: category } = useCategory(id);
  const { data: products, isLoading, error } = useProducts({ category_id: id, available: true });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">

      <div className="max-w-6xl mx-auto w-full px-4 pt-24 pb-8 flex-1">
        <h1 className="text-2xl font-bold text-black mb-6">{category?.name ?? 'Category'}</h1>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && <div className="text-center py-12 text-red-600">Failed to load products.</div>}

        {!isLoading && !error && (!products || products.length === 0) && (
          <div className="text-center py-12 text-black/60">No items in this category yet.</div>
        )}

        {!isLoading && products && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}