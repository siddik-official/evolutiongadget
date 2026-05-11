'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants, type Transition } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ShowcaseFeature {
  label: string;
  icon: LucideIcon;
}

export interface SpatialProductShowcaseProps {
  /** Path to product image in /public */
  image: string;
  /** Small uppercase line above the title */
  eyebrow: string;
  /** Headline — animates character-by-character with 3D flip */
  title: string;
  /** Short tagline shown beneath the title in accent color */
  tagline: string;
  /** Supporting paragraph */
  description: string;
  /** Primary CTA destination (category page) */
  href: string;
  /** Primary CTA label */
  ctaLabel: string;
  /** 3 short feature pills */
  features: ShowcaseFeature[];
  /** Flip column order — image on left, text on right */
  reverse?: boolean;
  /** Above-the-fold sections use mount animation; rest use scroll trigger */
  priority?: boolean;
  /** Optional alt text override */
  alt?: string;
}

const titleChar: Variants = {
  hidden: { opacity: 0, y: 60, rotateX: -90, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

function AnimatedTitle({
  text,
  priority,
}: {
  text: string;
  priority: boolean;
}) {
  const words = text.split(' ');
  let charIndex = 0;

  const motionProps = priority
    ? { initial: 'hidden' as const, animate: 'visible' as const }
    : {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: { once: true, amount: 0.4 },
      };

  return (
    <motion.h1
      {...motionProps}
      transition={{ staggerChildren: 0.035, delayChildren: 0.15 }}
      className="text-[2.25rem] sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.02] [perspective:1000px]"
      aria-label={text}
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

export default function SpatialProductShowcase({
  image,
  eyebrow,
  title,
  tagline,
  description,
  href,
  ctaLabel,
  features,
  reverse = false,
  priority = false,
  alt,
}: SpatialProductShowcaseProps) {
  const visualEnter = priority
    ? { initial: 'mount' as const, animate: 'mount' as const }
    : {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: { once: true, amount: 0.3 },
      };

  const textEnter = priority
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.5 },
      };

  const fadeWith = (delay: number): Transition => ({
    duration: 0.6,
    delay: priority ? delay : delay * 0.5,
  });

  return (
    <section className="relative w-full overflow-hidden bg-[#0F1115] text-zinc-100">
      {/* Cool radial glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: reverse
              ? 'radial-gradient(circle at 30% 55%, rgba(47, 111, 237, 0.28), transparent 55%)'
              : 'radial-gradient(circle at 70% 55%, rgba(47, 111, 237, 0.28), transparent 55%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: reverse
              ? 'radial-gradient(circle at 82% 25%, rgba(20, 184, 166, 0.10), transparent 50%)'
              : 'radial-gradient(circle at 18% 25%, rgba(20, 184, 166, 0.10), transparent 50%)',
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

      <div className="container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-14 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center min-h-[640px] lg:min-h-[760px]">
        {/* Visual column — first on mobile */}
        <div
          className={`order-1 ${reverse ? 'lg:order-2' : 'lg:order-1'} relative flex items-center justify-center w-full overflow-hidden min-h-[360px] sm:min-h-[460px] lg:min-h-[600px] [perspective:1400px]`}
        >
          {/* Outer dashed ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            animate={priority ? { opacity: 1, scale: 1, rotate: 360 } : { rotate: 360 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              opacity: { duration: 1, delay: priority ? 0.4 : 0.2 },
              scale: { duration: 1.2, delay: priority ? 0.4 : 0.2, ease: [0.16, 1, 0.3, 1] },
              rotate: { duration: 60, repeat: Infinity, ease: 'linear' },
            }}
            className="absolute size-[320px] sm:size-[480px] lg:size-[600px] rounded-full border border-dashed border-[#2F6FED]/35 max-w-[90vw] max-h-[90vw]"
          />
          {/* Inner ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            animate={priority ? { opacity: 1, scale: 1, rotate: -360 } : { rotate: -360 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              opacity: { duration: 1, delay: priority ? 0.55 : 0.3 },
              scale: { duration: 1.2, delay: priority ? 0.55 : 0.3, ease: [0.16, 1, 0.3, 1] },
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

          {/* Product — 3D spring entrance + idle float */}
          <ProductMedia
            image={image}
            alt={alt ?? title}
            priority={priority}
            visualEnter={visualEnter}
          />

          {/* Floating status pill */}
          <motion.div
            {...textEnter}
            transition={fadeWith(1.5)}
            className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-[#161A22]/90 border border-[#2A3140] backdrop-blur-md whitespace-nowrap"
          >
            <span className="size-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-300 font-medium">
              In Stock · Free Shipping
            </span>
          </motion.div>
        </div>

        {/* Content column */}
        <div
          className={`order-2 ${reverse ? 'lg:order-1' : 'lg:order-2'} ${reverse ? 'lg:text-right' : ''}`}
        >
          <motion.div
            {...textEnter}
            transition={fadeWith(0)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2F6FED]/12 border border-[#2F6FED]/35 text-[#9DBBFF] text-[11px] font-semibold uppercase tracking-[0.18em] mb-6`}
          >
            <Sparkles className="size-3" />
            {eyebrow}
          </motion.div>

          <AnimatedTitle text={title} priority={priority} />

          <motion.p
            {...textEnter}
            transition={fadeWith(0.95)}
            className="mt-4 text-lg sm:text-xl font-medium text-[#14B8A6]"
          >
            {tagline}
          </motion.p>

          <motion.p
            {...textEnter}
            transition={fadeWith(1.05)}
            className={`mt-5 text-base sm:text-lg text-[#9AA4B2] max-w-md leading-relaxed ${reverse ? 'lg:ml-auto' : ''}`}
          >
            {description}
          </motion.p>

          <motion.div
            {...textEnter}
            transition={fadeWith(1.2)}
            className={`flex flex-wrap items-center gap-3 mt-8 ${reverse ? 'lg:justify-end' : ''}`}
          >
            <Button
              size="lg"
              asChild
              className="gap-2 bg-[#2F6FED] text-white hover:bg-[#1F5AD1] shadow-[0_10px_40px_rgba(47,111,237,0.35)] hover:shadow-[0_12px_50px_rgba(47,111,237,0.55)] transition-all border-0 font-semibold"
            >
              <Link href={href}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-[#2A3140] bg-[#161A22] text-[#F5F7FA] hover:bg-[#1D2330] hover:text-white"
            >
              <Link href={href}>Learn more</Link>
            </Button>
          </motion.div>

          <motion.div
            {...textEnter}
            transition={fadeWith(1.4)}
            className={`grid grid-cols-3 gap-3 mt-10 max-w-md ${reverse ? 'lg:ml-auto' : ''}`}
          >
            {features.map((f) => (
              <div
                key={f.label}
                className="rounded-xl border border-[#2A3140] bg-[#161A22]/70 backdrop-blur p-3 text-center"
              >
                <f.icon className="mx-auto size-4 text-[#14B8A6] mb-1.5" />
                <span className="text-[11px] font-medium text-[#F5F7FA] leading-tight block">
                  {f.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProductMedia({
  image,
  alt,
  priority,
  visualEnter,
}: {
  image: string;
  alt: string;
  priority: boolean;
  visualEnter:
    | {
        initial: 'mount';
        animate: 'mount';
      }
    | {
        initial: 'hidden';
        whileInView: 'visible';
        viewport: { once: boolean; amount: number };
      };
}) {
  const variants: Variants = {
    hidden: {
      opacity: 0,
      rotateY: 95,
      rotateX: -25,
      scale: 0.35,
      filter: 'blur(24px)',
    },
    visible: {
      opacity: 1,
      rotateY: 0,
      rotateX: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 55,
        damping: 14,
        delay: 0.2,
      },
    },
    mount: {
      opacity: 1,
      rotateY: 0,
      rotateX: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 55,
        damping: 14,
        delay: 0.5,
      },
    },
  };

  return (
    <motion.div
      {...visualEnter}
      variants={variants}
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
          src={image}
          alt={alt}
          width={520}
          height={520}
          priority={priority}
          unoptimized
          className="w-56 h-56 sm:w-72 sm:h-72 lg:w-[420px] lg:h-[420px] object-contain select-none"
          draggable={false}
        />
      </motion.div>
    </motion.div>
  );
}
