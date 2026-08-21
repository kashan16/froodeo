import Image from "next/image"
import { Star, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProductCardProps {
    name: string
    image: string
    rating: number
    reviews: number
    price: number
    isBestSeller?: boolean
}

export const ProductCard = ({
    name,
    image,
    rating,
    reviews,
    price,
    isBestSeller = false,
}: ProductCardProps) => {
    return (
        <div className="relative flex flex-col sm:flex-row w-full max-w-sm sm:max-w-md min-h-[280px] sm:min-h-[192px] rounded-2xl border border-zinc-100 shadow-sm overflow-hidden bg-white">
            {/* Image - full bleed, corner to corner */}
            <div className="relative w-full h-52 sm:h-auto sm:w-2/5 shrink-0 bg-zinc-100">
                {isBestSeller && (
                    <span className="absolute top-4 left-0 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-r-full shadow-md z-10">
                        Best Seller
                    </span>
                )}
                <Image
                    src={image}
                    alt={name}
                    fill
                    className="object-cover"
                />
            </div>

            {/* Info - flush top/bottom, only horizontal breathing room */}
            <div className="relative flex-1 px-4 pt-3 pb-3">
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-semibold text-black leading-snug">
                        {name}
                    </h3>

                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
                        <span className="text-sm font-medium text-black">{rating}</span>
                        <span className="text-sm text-zinc-400">({reviews})</span>
                    </div>

                    <div className="text-xs text-zinc-500 mt-1">
                        Starts from
                        <span className="text-base font-bold text-black ml-1 block">
                            ₹{price}
                        </span>
                    </div>
                </div>

                <Button className="absolute bottom-3 right-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 py-1 h-9 text-sm font-semibold flex items-center gap-1">
                    Add <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}