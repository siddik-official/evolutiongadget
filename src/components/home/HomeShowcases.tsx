"use client";

import {
  Waves,
  Cpu,
  BatteryFull,
  Headphones,
  Volume2,
  Bluetooth,
  Zap,
  Plug,
  ShieldCheck,
  Cable,
  GitFork,
  Wifi,
} from "lucide-react";
import SpatialProductShowcase, {
  type SpatialProductShowcaseProps,
} from "@/components/ui/spatial-product-showcase";

const SHOWCASES: SpatialProductShowcaseProps[] = [
  {
    image: "/airpod_pro.png",
    eyebrow: "Audio · New",
    title: "Airpod Pro 2nd Gen",
    tagline: "Evolve the way you listen.",
    description:
      "Adaptive Audio tunes itself to every moment. 2× the active noise cancellation. All powered by the H2 chip — handpicked by Evolution Gadget for people who refuse to compromise on sound.",
    href: "/category/airpods",
    ctaLabel: "Shop AirPods",
    features: [
      { label: "Adaptive ANC", icon: Waves },
      { label: "H2 Chip", icon: Cpu },
      { label: "30h Battery", icon: BatteryFull },
    ],
  },
  {
    image: "/hoco_headphone.png",
    eyebrow: "Studio Sound",
    title: "Hoco Wireless Headphones",
    tagline: "Cinematic sound, marathon comfort.",
    description:
      "Deep bass, crystal highs, and plush memory-foam earcups built for hours of uninterrupted listening. Wireless freedom with rock-solid Bluetooth 5.3.",
    href: "/category/headphones",
    ctaLabel: "Shop Headphones",
    reverse: true,
    features: [
      { label: "Bluetooth 5.3", icon: Bluetooth },
      { label: "Hi-Fi Drivers", icon: Headphones },
      { label: "40h Playback", icon: Volume2 },
    ],
  },
  {
    image: "/powerbank.png",
    eyebrow: "Energy",
    title: "Pro Series Powerbank",
    tagline: "Charge fast. Stay charged longer.",
    description:
      "Pocketable power that keeps up with your day. USB-C PD fast charging, pass-through support, and a high-density 20,000mAh cell that tops up phones, tablets, and even laptops.",
    href: "/category/powerbank",
    ctaLabel: "Shop Powerbanks",
    features: [
      { label: "20,000mAh", icon: BatteryFull },
      { label: "22.5W PD", icon: Zap },
      { label: "Safe Charging", icon: ShieldCheck },
    ],
  },
  {
    image: "/apple_charger.png",
    eyebrow: "Fast Charge",
    title: "20W USB-C Adapter",
    tagline: "Pocket-sized power.",
    description:
      "Compact, certified, and seriously fast. The 20W USB-C adapter delivers high-speed charging for iPhone, AirPods, and any USB-C device — without the heat or bulk.",
    href: "/category/chargers",
    ctaLabel: "Shop Chargers",
    reverse: true,
    features: [
      { label: "20W PD", icon: Plug },
      { label: "Foldable Pin", icon: GitFork },
      { label: "Safe Circuit", icon: ShieldCheck },
    ],
  },
  {
    image: "/c-type-cable.png",
    eyebrow: "Connect",
    title: "Braided USB-C Cable",
    tagline: "Built to last every plug-in.",
    description:
      "Premium woven nylon shell, reinforced aluminium connectors, 60W fast-charge capable, and full data sync. Tangle-free, fray-free, future-proof.",
    href: "/category/cables",
    ctaLabel: "Shop Cables",
    features: [
      { label: "60W PD", icon: Zap },
      { label: "Braided", icon: Cable },
      { label: "Data + Charge", icon: Wifi },
    ],
  },
];

export function HomeShowcases() {
  return (
    <>
      {SHOWCASES.map((showcase, i) => (
        <SpatialProductShowcase
          key={showcase.image}
          {...showcase}
          priority={i === 0}
        />
      ))}
    </>
  );
}
