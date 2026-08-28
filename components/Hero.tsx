'use client';

import { ActionButton } from "@/components/ui/action-button";
import { simulateDelay } from "@/lib/simulate-display";
import { ArrowRight, ChevronDown, Flame, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";


export const Hero = () => {
    const router = useRouter();

    return (
        <section className="relative w-full">
            {/* Hero background */}
            <div className="relative min-w-full h-[500px] md:h-[600px] lg:h-[700px]">
                {/* Desktop/tablet image */}
                <Image
                    src="/hero.png"
                    alt="Lucknowi Biryani hero background"
                    fill
                    priority
                    className="hidden md:block object-cover"
                />

                {/* Mobile image */}
                <Image
                    src="/heromob.png"
                    alt="Lucknowi Biryani hero background"
                    fill
                    priority
                    className="block md:hidden object-cover"
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
                        <ActionButton
                            onAction={async () => {
                                await simulateDelay(400);
                                router.push('/menu');
                            }}
                            idleLabel={
                                <span className="flex items-center gap-2">
                                    Order Now
                                    <ArrowRight size={18} />
                                </span>
                            }
                            loadingLabel="Loading menu..."
                            successTitle="Let's go!"
                            className="w-auto px-6 rounded-lg"
                        />
                    </div>

                    {/* Carousel controls */}
                    <div className="flex items-center justify-between px-6 pb-5">
                    </div>
                </div>
            </div>
        </section>
    );
};