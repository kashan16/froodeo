import { BestSeller } from "@/components/BestSellers";
import { Category } from "@/components/Category";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Hero/>
      <Category/>
      <BestSeller/>
    </div>
  );
}
