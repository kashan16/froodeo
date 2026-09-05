'use client';

import { useCart } from "@/lib/cart-context";
import Link from "next/link";
import CartIcon from "./ui/cart-icon";

const NavbarItem = [
    { name: "Home", href: "/" },
    { name: "Menu", href: "/menu" },
    { name: "Combos", href: "/combos" },
    { name: "Offers", href: "/offers" },
    { name: "Contact", href: "#footer" },
];

export const Navbar = () => {
    const { totalItems } = useCart();

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
    );
};