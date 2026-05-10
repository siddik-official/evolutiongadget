import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { HeroSection } from "@/components/home/HeroSection";
import { BannerSlider } from "@/components/home/BannerSlider";
import type { Banner, BannerSettings } from "@/types";

async function fetchActiveBanners(): Promise<{
  banners: Banner[];
  settings: BannerSettings | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data: banners } = await supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const { data: settings } = await supabase
      .from("banner_settings")
      .select("*")
      .single();

    return {
      banners: (banners ?? []) as Banner[],
      settings: settings as BannerSettings | null,
    };
  } catch {
    return { banners: [], settings: null };
  }
}

export async function HeroBanner() {
  const { banners, settings } = await fetchActiveBanners();
  const transitionSeconds = settings?.transition_seconds ?? 5;

  // No active banners → show existing fallback hero
  if (banners.length === 0) {
    return <HeroSection />;
  }

  // Single banner → show image, no slider UI
  if (banners.length === 1) {
    const banner = banners[0];
    const img = (
      <div className="relative w-full">
        <Image
          src={banner.image_url}
          alt={banner.alt_text ?? banner.title ?? "Banner"}
          width={1920}
          height={800}
          priority
          className="w-full h-auto"
          sizes="100vw"
        />
      </div>
    );

    return (
      <section className="w-full overflow-hidden">
        {banner.link_url ? (
          <Link href={banner.link_url} className="block">
            {img}
          </Link>
        ) : (
          img
        )}
      </section>
    );
  }

  // Multiple banners → animated slider
  return (
    <BannerSlider banners={banners} transitionSeconds={transitionSeconds} />
  );
}
