import type { Metadata } from "next";
import { HomeShowcases } from "@/components/home/HomeShowcases";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Evolution Gadget — Premium Tech Made Simple",
  description:
    "A trusted destination for cutting-edge accessories and mobile marvels.",
};

export default function HomePage() {
  return <HomeShowcases />;
}
