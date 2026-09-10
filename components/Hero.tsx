'use client';

import { ActionButton } from "@/components/ui/action-button";
import { simulateDelay } from "@/lib/simulate-display";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronDown, Flame, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const HERO_IMAGES = [
    { src: "/hero.png", alt: "Lucknowi Biryani hero background" },
    { src: "/image2.jpeg", alt: "Freshly cooked Lucknowi Biryani" },
    { src: "/image3.jpeg", alt: "Biryani being served" },
    { src: "/image4.jpeg", alt: "Signature Lucknowi dish" },
    { src: "/image5.jpeg", alt: "Hygienic kitchen preparation" },
    { src: "/image6.jpeg", alt: "Fast biryani delivery" },
];

const AUTOPLAY_DELAY = 4000;

export const Hero = () => {
    const router = useRouter();

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, duration: 30 },
        [Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: false })]
    );

    const [selectedIndex, setSelectedIndex] = useState(0);

    const scrollTo = useCallback(
        (index: number) => emblaApi && emblaApi.scrollTo(index),
        [emblaApi]
    );

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        onSelect();
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
    }, [emblaApi, onSelect]);

    return (
        <section className="relative w-full">
            {/* Hero background carousel */}
            <div className="relative min-w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
                <div className="h-full w-full overflow-hidden" ref={emblaRef}>
                    <div className="flex h-full touch-pan-y">
                        {HERO_IMAGES.map((image, index) => (
                            <div
                                key={image.src}
                                className="relative min-w-0 flex-[0_0_100%] h-full overflow-hidden"
                            >
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    fill
                                    priority={index === 0}
                                    sizes="100vw"
                                    className={`object-cover object-center ease-linear transition-transform ${
                                        selectedIndex === index
                                            ? "scale-110"
                                            : "scale-100"
                                    }`}
                                    style={{
                                        transitionDuration: `${AUTOPLAY_DELAY + 500}ms`,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dark overlay for text legibility */}
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />

                {/* Content overlay */}
                <div className="absolute inset-0 z-10 flex flex-col justify-around pointer-events-none">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 pt-5 pointer-events-auto">
                        <button className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full">
                            <MapPin size={16} className="text-orange-500" />
                            <span>Delivering in Lucknow</span>
                            <ChevronDown size={14} />
                        </button>

                        <div className="flex items-center gap-2">
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="px-12 pb-10 max-w-xl pointer-events-auto">
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
                    <div className="flex items-center justify-center gap-2 px-6 pb-5 pointer-events-auto">
                        {HERO_IMAGES.map((image, index) => (
                            <button
                                key={image.src}
                                onClick={() => scrollTo(index)}
                                aria-label={`Go to slide ${index + 1}`}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    selectedIndex === index
                                        ? "w-6 bg-orange-500"
                                        : "w-2 bg-white/50 hover:bg-white/80"
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};