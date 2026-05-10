import { Marquee } from "@/components/ui/marquee";

const taglines = [
  "Performance Jerseys, Everyday Comfort",
  "Street-Ready Tees with Athletic Energy",
  "Tailored Trousers Built to Move",
  "Easy-Fit Pants for Daily Wear",
  "Fresh Football, Cricket and Lifestyle Drops",
  "Premium Fabrics with Clean Stitching",
  "Cash on Delivery Across Bangladesh",
  "Simple Exchange Support for Better Fit",
];

export function TrustBadges() {
  return (
    <section className="border-b border-border/60 bg-card/50 backdrop-blur-sm">
      <Marquee
        aria-label="Evolution Gadget product highlights"
        className="py-4 sm:py-6 [--duration:30s] [--gap:2rem] sm:[--gap:3rem] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        pauseOnHover
      >
        {taglines.map((tagline) => (
          <div
            key={tagline}
            className="flex items-center gap-3 sm:gap-4 text-foreground/70 hover:text-foreground transition-colors"
          >
            <p
              className="whitespace-nowrap text-[11px] sm:text-sm md:text-base tracking-[0.12em] uppercase"
              style={{
                fontFamily: '"Noize Sport", "Space Grotesk", sans-serif',
              }}
            >
              {tagline}
            </p>
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-foreground/25"
            />
          </div>
        ))}
      </Marquee>
    </section>
  );
}
