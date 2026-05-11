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
      className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.02] [perspective:1000px]"
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
                className="bg-gradient-to-b from-white via-amber-100 to-amber-400 bg-clip-text text-transparent"
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
    <section className="relative w-full overflow-hidden bg-black text-zinc-100">
      {/* Warm radial glow — replaces the old green neon */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 55%, rgba(245, 158, 11, 0.22), transparent 55%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(244, 63, 94, 0.08), transparent 50%)',
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

      <div className="container relative z-10 mx-auto max-w-7xl px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[640px] lg:min-h-[760px]">
        {/* Content column */}
        <div className="order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold uppercase tracking-[0.18em] mb-6"
          >
            <Sparkles className="size-3" />
            Evolution Gadget · Sound Reimagined
          </motion.div>

          <AnimatedTitle />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
            className="mt-4 text-lg sm:text-xl font-medium text-amber-200/80"
          >
            Evolve the way you listen.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mt-5 text-base sm:text-lg text-zinc-400 max-w-md leading-relaxed"
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
              className="gap-2 bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-950 hover:from-amber-200 hover:to-amber-400 shadow-[0_10px_40px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_50px_rgba(245,158,11,0.5)] transition-all border-0 font-semibold"
            >
              <Link href="/products">
                Shop AirPods <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur"
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
                className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur p-3 text-center"
              >
                <f.icon className="mx-auto size-4 text-amber-400 mb-1.5" />
                <span className="text-[11px] font-medium text-zinc-300 leading-tight block">
                  {f.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Visual column */}
        <div className="order-1 lg:order-2 relative flex items-center justify-center min-h-[380px] sm:min-h-[460px] lg:min-h-[600px] [perspective:1400px]">
          {/* Outer dashed ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, rotate: 360 }}
            transition={{
              opacity: { duration: 1, delay: 0.4 },
              scale: { duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 60, repeat: Infinity, ease: 'linear' },
            }}
            className="absolute size-[420px] sm:size-[520px] lg:size-[600px] rounded-full border border-dashed border-amber-500/30"
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
            className="absolute size-[280px] sm:size-[340px] lg:size-[400px] rounded-full border border-amber-500/15"
          />

          {/* Pulsing warm glow */}
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute size-[260px] sm:size-[320px] rounded-full bg-amber-500/25 blur-3xl"
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
              className="relative drop-shadow-[0_30px_60px_rgba(245,158,11,0.4)]"
            >
              <Image
                src="/airpod_pro.png"
                alt="Airpod Pro 2nd Gen"
                width={520}
                height={520}
                priority
                className="size-64 sm:size-80 lg:size-[420px] object-contain select-none"
                draggable={false}
              />
            </motion.div>
          </motion.div>

          {/* Floating status pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-white/10 backdrop-blur-md whitespace-nowrap"
          >
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-300 font-medium">
              In Stock · Free Shipping
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
