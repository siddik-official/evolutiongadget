'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Waves,
  BatteryFull,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { label: 'Adaptive ANC', icon: Waves },
  { label: 'H2 Chip', icon: Cpu },
  { label: '30h Battery', icon: BatteryFull },
];

const TITLE = 'Airpod Pro 2nd Gen';

const titleChar: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
    rotateX: -90,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

function AnimatedTitle() {
  const words = TITLE.split(' ');
  let charIndex = 0;

  return (
    <motion.h1
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.035, delayChildren: 0.25 }}
      className="text-[2.25rem] sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.02] [perspective:1000px]"
      aria-label={TITLE}
    >
      {words.map((word, wi) => (
        <span
          key={wi}
          className="inline-block whitespace-nowrap mr-3 last:mr-0"
        >
          {word.split('').map((char) => {
            const i = charIndex++;
            return (
              <motion.span
                key={i}
                variants={titleChar}
                style={{ transformOrigin: '50% 100%', display: 'inline-block' }}
                className="bg-gradient-to-b from-white via-sky-100 to-[#2F6FED] bg-clip-text text-transparent"
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </motion.h1>
  );
}

export default function SpatialProductShowcase() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0F1115] text-zinc-100">
      {/* Cool radial glows — royal blue + teal */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 55%, rgba(47, 111, 237, 0.28), transparent 55%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 25%, rgba(20, 184, 166, 0.10), transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, white 1px, transparent 1.5px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[640px] lg:min-h-[760px]">
        {/* Visual column — first on mobile */}
        <div className="order-1 lg:order-2 relative flex items-center justify-center w-full overflow-hidden min-h-[360px] sm:min-h-[460px] lg:min-h-[600px] [perspective:1400px]">
          {/* Outer dashed ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            transition={{
              opacity: { duration: 1, delay: 0.4 },
              scale: { duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 60, repeat: Infinity, ease: 'linear' },
            }}
            className="absolute size-[320px] sm:size-[480px] lg:size-[600px] rounded-full border border-dashed border-[#2F6FED]/35 max-w-[90vw] max-h-[90vw]"
          />
          {/* Inner ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, rotate: -360 }}
            transition={{
              opacity: { duration: 1, delay: 0.55 },
              scale: { duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 45, repeat: Infinity, ease: 'linear' },
            }}
            className="absolute size-[220px] sm:size-[320px] lg:size-[400px] rounded-full border border-[#2F6FED]/20"
          />

          {/* Pulsing cool glow */}
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute size-[220px] sm:size-[300px] rounded-full bg-[#2F6FED]/30 blur-3xl"
          />

          {/* AirPod — 3D spring entrance + idle float */}
          <motion.div
            initial={{
              opacity: 0,
              rotateY: 95,
              rotateX: -25,
              scale: 0.35,
              filter: 'blur(24px)',
            }}
            animate={{
              opacity: 1,
              rotateY: 0,
              rotateX: 0,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{
              type: 'spring',
              stiffness: 55,
              damping: 14,
              delay: 0.5,
              filter: { duration: 1, delay: 0.5 },
            }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative z-10"
          >
            <motion.div
              animate={{ y: [-14, 14, -14], rotate: [-4, 4, -4] }}
              transition={{
                y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="relative drop-shadow-[0_30px_60px_rgba(47,111,237,0.45)]"
            >
              <Image
                src="/airpod_pro.png"
                alt="Airpod Pro 2nd Gen"
                width={520}
                height={520}
                priority
                unoptimized
                className="w-56 h-56 sm:w-72 sm:h-72 lg:w-[420px] lg:h-[420px] object-contain select-none"
                draggable={false}
              />
            </motion.div>
          </motion.div>

          {/* Floating status pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-[#161A22]/90 border border-[#2A3140] backdrop-blur-md whitespace-nowrap"
          >
            <span className="size-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-300 font-medium">
              In Stock · Free Shipping
            </span>
          </motion.div>
        </div>

        {/* Content column */}
        <div className="order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2F6FED]/12 border border-[#2F6FED]/35 text-[#9DBBFF] text-[11px] font-semibold uppercase tracking-[0.18em] mb-6"
          >
            <Sparkles className="size-3" />
            Evolution Gadget · Sound Reimagined
          </motion.div>

          <AnimatedTitle />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
            className="mt-4 text-lg sm:text-xl font-medium text-[#14B8A6]"
          >
            Evolve the way you listen.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mt-5 text-base sm:text-lg text-[#9AA4B2] max-w-md leading-relaxed"
          >
            Adaptive Audio tunes itself to every moment. 2× the noise
            cancellation. All powered by the H2 chip — handpicked by Evolution
            Gadget for people who refuse to compromise on sound.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex flex-wrap items-center gap-3 mt-8"
          >
            <Button
              size="lg"
              asChild
              className="gap-2 bg-[#2F6FED] text-white hover:bg-[#1F5AD1] shadow-[0_10px_40px_rgba(47,111,237,0.35)] hover:shadow-[0_12px_50px_rgba(47,111,237,0.55)] transition-all border-0 font-semibold"
            >
              <Link href="/products">
                Shop AirPods <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-[#2A3140] bg-[#161A22] text-[#F5F7FA] hover:bg-[#1D2330] hover:text-white"
            >
              <Link href="/categories">Explore Gadgets</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="grid grid-cols-3 gap-3 mt-10 max-w-md"
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.45 + i * 0.08 }}
                className="rounded-xl border border-[#2A3140] bg-[#161A22]/70 backdrop-blur p-3 text-center"
              >
                <f.icon className="mx-auto size-4 text-[#14B8A6] mb-1.5" />
                <span className="text-[11px] font-medium text-[#F5F7FA] leading-tight block">
                  {f.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
