"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { value: "5,000+", label: "Happy Customers" },
  { value: "200+", label: "Products" },
  { value: "48h", label: "Fast Delivery" },
];

export function HeroSection() {
  return (
    <section
      className="relative text-[#E5E5E5] overflow-hidden min-h-[520px] sm:min-h-[600px] lg:min-h-[680px] flex items-center"
      style={{ background: `linear-gradient(to bottom right, var(--theme-dark-from), var(--theme-dark-via), var(--theme-dark-to))` }}
    >
      {/* Background geometric pattern */}
      <div className="absolute inset-0 opacity-[0.04]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              `radial-gradient(circle at 20% 50%, var(--theme-dot) 1px, transparent 1px), radial-gradient(circle at 80% 50%, var(--theme-dot) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Glow accents */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.12] blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--theme-glow))" }}
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-3xl pointer-events-none"
        style={{ background: "hsl(var(--theme-glow))" }}
        aria-hidden
      />

      {/* Diagonal stripe accent */}
      <div
        className="absolute right-0 top-0 h-full w-[45%] opacity-[0.03] pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 40px)",
        }}
        aria-hidden
      />

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-5">
                <Zap className="size-3" />
                New Season 2026 Collection
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight"
            >
              Fit{" "}
              <span className="text-primary relative">
                &amp;
                <span
                  className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/40 rounded-full"
                  aria-hidden
                />
              </span>{" "}
              Kit
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-2 text-lg sm:text-xl font-medium text-primary/90"
            >
              Find your perfect fit
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.26 }}
              className="mt-5 text-base sm:text-lg text-white/65 max-w-md leading-relaxed"
            >
              Premium jerseys, stylish sportswear &amp; bold apparel — crafted
              for champions. Fast delivery across Bangladesh.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.36 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <Button
                size="lg"
                className="gap-2 text-base px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
                asChild
              >
                <Link href="/products">
                  Shop Now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base border-white/20 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm"
                asChild
              >
                <Link href="/categories">Browse Categories</Link>
              </Button>
            </motion.div>

            {/* Trust pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-4 mt-10 text-xs text-white/55"
            >
              <div className="flex items-center gap-1.5">
                <Truck className="size-3.5 text-primary/70" />
                Cash on Delivery
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary/70" />
                Authentic Quality
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🇧🇩</span>
                Nationwide Delivery
              </div>
            </motion.div>
          </div>

          {/* Right: Stats cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:flex flex-col gap-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl px-6 py-5 flex items-center justify-between hover:bg-white/8 hover:border-primary/30 transition-all duration-300"
                style={{ marginLeft: i % 2 === 1 ? "2rem" : "0" }}
              >
                <span className="text-3xl font-extrabold text-primary">
                  {stat.value}
                </span>
                <span className="text-sm text-white/50 font-medium text-right max-w-[120px]">
                  {stat.label}
                </span>
              </motion.div>
            ))}

            {/* Decorative badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="self-end bg-primary text-primary-foreground rounded-2xl px-5 py-4 text-center shadow-lg shadow-primary/20"
            >
              <p className="text-lg font-black">COD</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                Available
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
