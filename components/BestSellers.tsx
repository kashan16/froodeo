import Link from "next/link"
import { ProductCard } from "./ui/product-card"

const bestSellers = [
    {
        name: "Lucknowi Chicken Biryani",
        image: "/chicken.png",
        rating: 4.9,
        reviews: 245,
        price: 249,
        isBestSeller: true,
    },
    {
        name: "Hyderabadi Mutton Biryani",
        image: "/mutton.png",
        rating: 4.8,
        reviews: 189,
        price: 329,
        isBestSeller: true,
    },
    {
        name: "Veg Dum Biryani",
        image: "/veg.png",
        rating: 4.7,
        reviews: 156,
        price: 199,
        isBestSeller: true,
    },
    {
        name: "Egg Biryani Special",
        image: "/egg.png",
        rating: 4.6,
        reviews: 132,
        price: 219,
        isBestSeller: true,
    },
]

export const BestSeller = () => {
    return (
        <section className="w-full px-4 py-6 md:px-8">
            <div className="flex flex-row items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-black">
                    Best Sellers
                </h2>
                <Link
                    href="/best-sellers"
                    className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
                >
                    View All
                </Link>
            </div>

            {/* Mobile: horizontal scroll snap row | Desktop: grid */}
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-hide pb-2">
                {bestSellers.map((item) => (
                    <div
                        key={item.name}
                        className="min-w-[85%] xs:min-w-[70%] sm:min-w-0 snap-start"
                    >
                        <ProductCard {...item} />
                    </div>
                ))}
            </div>
        </section>
    )
}