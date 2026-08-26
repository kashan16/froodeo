'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useCategories } from "@/hooks/useCategories";

export const Category = () => {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <section className="w-full px-4 py-6 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-4">Shop by Category</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !categories || categories.length === 0) return null;

  return (
    <section className="w-full px-4 py-6 md:px-8">
      <div className="flex flex-row items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-black">Shop by Category</h2>
        <Link
          href="/menu"
          className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/category/${cat.id}`}>
            <Card className="bg-white border-none shadow-none hover:bg-white transition-colors duration-200 cursor-pointer rounded-xl">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-3">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-100">
                  {cat.image_url && (
                    <Image src={cat.image_url} alt={cat.name} fill className="object-cover" />
                  )}
                </div>
                <span className="text-xs md:text-sm font-semibold text-black text-center line-clamp-1">
                  {cat.name}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};