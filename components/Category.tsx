import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

const categories = [
    { name: "Chicken Biryani", href: "/category/chicken-biryani", image: '/chicken.png' },
    { name: "Mutton Biryani", href: "/category/mutton-biryani", image: '/mutton.png' },
    { name: "Veg Biryani", href: "/category/veg-biryani", image: '/veg.png' },
    { name: "Egg Biryani", href: "/category/egg-biryani", image: '/egg.png' },
    { name: "Family Pack", href: "/category/family-pack", image: '/family.png' },
    { name: "Beverages", href: "/category/beverages", image: '/beverages.png' },
]

export const Category = () => {
    return (
        <section className="w-full px-4 py-6 md:px-8">
            <div className="flex flex-row items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-black">
                    Shop by Category
                </h2>
                <Link
                    href="/categories"
                    className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
                >
                    View All
                </Link>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                {categories.map((cat) => (
                    <Link key={cat.name} href={cat.href}>
                        <Card className="bg-white border-none shadow-none hover:bg-white transition-colors duration-200 cursor-pointer rounded-xl">
                            <CardContent className="flex flex-col items-center justify-center gap-2 p-3">
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white">
                                    <Image
                                        src={cat.image}
                                        alt={cat.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <span className="text-xs md:text-sm font-semibold text-black text-center">
                                    {cat.name}
                                </span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    )
}