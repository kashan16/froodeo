import { Tag } from "lucide-react";

export default function OffersPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto w-full px-4 pt-24 pb-8 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
          <Tag size={28} className="text-orange-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">Offers</h1>
        <p className="text-black/60 max-w-sm">
          Coming soon — exciting offers and discounts are on the way.
        </p>
      </div>
    </div>
  );
}