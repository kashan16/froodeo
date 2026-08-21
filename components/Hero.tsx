import Image from "next/image";
import { MapPin, ChevronDown, Share2, Clock, ArrowRight, ShieldCheck, Flame, Truck } from "lucide-react";

export const Hero = () => {
    return (
        <section className="relative w-full pt-8">
            {/* Hero background */}
            <div className="relative min-w-full h-[500px] md:h-[600px] lg:h-[700px]">
                <Image
                    src="/hero.png"
                    alt="Lucknowi Biryani hero background"
                    fill
                    priority
                    className="fill"
                />

                {/* Dark overlay for text legibility */}
                <div className="absolute inset-0 bg-black/10" />

                {/* Content overlay */}
                <div className="absolute inset-0 z-10 flex flex-col justify-around">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 pt-5">
                        <button className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full">
                            <MapPin size={16} className="text-orange-500" />
                            <span>Delivering in Lucknow</span>
                            <ChevronDown size={14} />
                        </button>

                        <div className="flex items-center gap-2">
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="px-12 pb-10 max-w-xl">
                        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-white">
                            Lucknowi Biryani
                        </h1>
                        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-orange-500 mb-3">
                            Delivered Hot!
                        </h1>
                        <p className="text-white/90 text-sm md:text-base mb-5">
                            Authentic taste of Lucknow,<br />now at your doorstep.
                        </p>

                        {/* Feature badges */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white text-xs md:text-sm px-3 py-2 rounded-full">
                                <ShieldCheck size={14} className="text-orange-500" />
                                Freshly Cooked
                            </div>
                            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white text-xs md:text-sm px-3 py-2 rounded-full">
                                <ShieldCheck size={14} className="text-orange-500" />
                                Hygienic Kitchen
                            </div>
                            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white text-xs md:text-sm px-3 py-2 rounded-full">
                                <Flame size={14} className="text-orange-500" />
                                Fast Delivery
                            </div>
                        </div>

                        {/* CTA */}
                        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 transition-colors text-white font-semibold px-6 py-3 rounded-lg">
                            Order Now
                            <ArrowRight size={18} />
                        </button>
                    </div>

                    {/* Carousel controls */}
                    <div className="flex items-center justify-between px-6 pb-5">
                    </div>
                </div>
            </div>
        </section>
    );
};