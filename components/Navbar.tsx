'use client';

import gsap from "gsap";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import { useCart } from "@/lib/cart-context";
import CartIcon from "./ui/cart-icon";
import { Input } from "./ui/input";
import MagnifierIcon from "./ui/magnifier-icon";
import XIcon from "./ui/x-icon";

const NavbarItem = [
    { name: "Home", href: "/" },
    { name: "Menu", href: "/menu" },
    { name: "Combos", href: "/combos" },
    { name: "Offers", href: "/offers" },
    { name: "Contact", href: "#footer" },
];

export const Navbar = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { totalItems } = useCart();

    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchButtonRef = useRef<HTMLButtonElement>(null);
    const searchFillRef = useRef<HTMLSpanElement>(null);

    const handleSearchClick = () => {
        setIsSearchOpen((prev) => !prev);
    };

    useLayoutEffect(() => {
        const wrapper = searchWrapperRef.current;
        const input = searchInputRef.current;
        const searchButton = searchButtonRef.current;
        const fill = searchFillRef.current;

        if (!wrapper || !input || !searchButton) return;

        if (isSearchOpen) {
            gsap.killTweensOf([wrapper, input, searchButton, fill]);

            gsap.to(searchButton, {
                scale: 0.8,
                opacity: 0,
                duration: 0.15,
                ease: "power2.in",
            });

            gsap.fromTo(
                wrapper,
                { width: 0, autoAlpha: 0 },
                { width: 260, autoAlpha: 1, duration: 0.4, ease: "power3.out" }
            );

            gsap.fromTo(
                input,
                { x: 12, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 0.3,
                    delay: 0.12,
                    ease: "power2.out",
                    onComplete: () => {
                        input.focus();
                    },
                }
            );

            if (fill) {
                gsap.fromTo(
                    fill,
                    { scale: 0.5, opacity: 0.3 },
                    { scale: 1.8, opacity: 0, duration: 0.5, ease: "power2.out" }
                );
            }
        } else {
            gsap.killTweensOf([wrapper, input, searchButton, fill]);

            gsap.to(input, { x: 8, opacity: 0, duration: 0.15, ease: "power2.in" });

            gsap.to(wrapper, { width: 0, autoAlpha: 0, duration: 0.3, ease: "power2.inOut" });

            gsap.to(searchButton, {
                scale: 1,
                opacity: 1,
                duration: 0.25,
                delay: 0.15,
                ease: "back.out(1.5)",
            });
        }

        return () => {
            gsap.killTweensOf([wrapper, input, searchButton, fill]);
        };
    }, [isSearchOpen]);

    return (
        <div className="flex flex-row justify-between items-center w-full h-16 px-4 md:px-8 bg-black absolute top-0 left-0 right-0 z-50">
            <Link href="/" className="flex flex-col leading-none shrink-0">
                <span className="text-2xl md:text-3xl font-extrabold text-orange-500 tracking-wide">
                    FROODEO
                </span>
                <span className="text-[10px] md:text-xs text-white/70 tracking-wide">
                    Royal Taste, Real Price
                </span>
            </Link>

            <div className="hidden md:flex flex-row items-center gap-8">
                {NavbarItem.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="text-white text-sm font-medium hover:text-orange-500 transition-colors duration-200"
                    >
                        {item.name}
                    </Link>
                ))}
            </div>

            <div className="flex flex-row items-center gap-4 shrink-0">
                <div className="flex items-center">
                    <div
                        ref={searchWrapperRef}
                        className="overflow-hidden flex items-center bg-zinc-900 rounded-full"
                        style={{ width: 0, opacity: 0, visibility: "hidden" }}
                    >
                        <Input
                            ref={searchInputRef}
                            className="bg-transparent border-none text-white placeholder:text-white/40 focus-visible:ring-0 h-9 px-4 min-w-0"
                            placeholder="Search..."
                        />
                        <button onClick={handleSearchClick} className="pr-3 shrink-0" aria-label="Close search">
                            <XIcon className="h-5 w-5 text-white hover:text-orange-500 transition-colors" />
                        </button>
                    </div>

                    <button
                        ref={searchButtonRef}
                        onClick={handleSearchClick}
                        className="relative flex items-center justify-center h-9 w-9"
                        aria-label="Open search"
                    >
                        <span
                            ref={searchFillRef}
                            className="absolute inset-0 rounded-full bg-orange-500 opacity-0 pointer-events-none"
                        />
                        <MagnifierIcon className="relative h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Cart — links to /checkout since there's no separate cart drawer built yet */}
                <Link
                    href="/checkout"
                    className="relative h-9 w-9 flex items-center justify-center"
                    aria-label={`Open cart, ${totalItems} items`}
                >
                    <CartIcon className="h-6 w-6 text-white" />
                    {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
                            {totalItems > 9 ? '9+' : totalItems}
                        </span>
                    )}
                </Link>
            </div>
        </div>
    );
};