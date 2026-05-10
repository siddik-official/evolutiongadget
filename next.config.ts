import type { NextConfig } from "next";

// Default to direct image delivery to avoid production 402 errors from /_next/image.
// Set NEXT_DISABLE_IMAGE_OPTIMIZATION=false at build time to re-enable Next optimization.
const disableImageOptimization =
  process.env.NEXT_DISABLE_IMAGE_OPTIMIZATION !== "true";

const nextConfig: NextConfig = {
  images: {
    unoptimized: disableImageOptimization,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lvmosmoifpjxnenglsuo.supabase.co",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
