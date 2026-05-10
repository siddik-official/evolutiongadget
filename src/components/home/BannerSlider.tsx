"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Banner } from "@/types";

interface Props {
  banners: Banner[];
  transitionSeconds: number;
}

export function BannerSlider({ banners, transitionSeconds }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const goTo = useCallback(
    (index: number, dir = 1) => {
      setDirection(dir);
      setCurrent((index + banners.length) % banners.length);
    },
    [banners.length],
  );

  const goNext = useCallback(() => {
    goTo(current + 1, 1);
  }, [current, goTo]);

  const goPrev = useCallback(() => {
    goTo(current - 1, -1);
  }, [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const timer = setInterval(goNext, transitionSeconds * 1000);
    return () => clearInterval(timer);
  }, [paused, transitionSeconds, banners.length, goNext]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  const banner = banners[current];

  const ImageContent = (
    <div className="relative w-full">
      <Image
        src={banner.image_url}
        alt={banner.alt_text ?? banner.title ?? `Banner ${current + 1}`}
        width={1920}
        height={800}
        priority
        className="w-full h-auto"
        sizes="100vw"
      />
      {/* Subtle gradient overlay for dots readability */}
      <div className="absolute inset-x-0 bottom-0 h-12 sm:h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
    </div>
  );

  return (
    <section
      className="relative w-full overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full"
        >
          {banner.link_url ? (
            <Link href={banner.link_url} className="block">
              {ImageContent}
            </Link>
          ) : (
            ImageContent
          )}
        </motion.div>
      </AnimatePresence>

      {/* Left arrow - smaller on mobile */}
      <button
        onClick={goPrev}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 sm:p-2.5 transition-colors backdrop-blur-sm"
        aria-label="Previous banner"
      >
        <ChevronLeft className="size-4 sm:size-5" />
      </button>

      {/* Right arrow - smaller on mobile */}
      <button
        onClick={goNext}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 sm:p-2.5 transition-colors backdrop-blur-sm"
        aria-label="Next banner"
      >
        <ChevronRight className="size-4 sm:size-5" />
      </button>

      {/* Dot indicators - smaller on mobile */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 sm:gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "bg-white w-5 sm:w-6 h-1.5 sm:h-2"
                : "bg-white/50 hover:bg-white/80 w-1.5 sm:w-2 h-1.5 sm:h-2"
            }`}
            aria-label={`Go to banner ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
