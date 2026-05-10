import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { TrackingScripts } from "@/components/TrackingScripts";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { buildCustomThemeCss, getThemeSettings } from "@/lib/theme";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Evolution Gadget — Premium Tech Made Simple",
    template: "%s | Evolution Gadget",
  },
  description:
    "A trusted destination for cutting-edge accessories and mobile marvels.",
  keywords: [
    "tech accessories",
    "mobile accessories",
    "gadgets",
    "Bangladesh",
    "Evolution Gadget",
    "premium tech",
    "COD",
  ],
  openGraph: {
    title: "Evolution Gadget — Premium Tech Made Simple",
    description:
      "A trusted destination for cutting-edge accessories and mobile marvels.",
    type: "website",
    locale: "en_BD",
    siteName: "Evolution Gadget",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Evolution Gadget",
      },
    ],
  },
  icons: {
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon-32x32.png",
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemeSettings();
  const customCss = theme.active === "custom" ? buildCustomThemeCss(theme) : null;

  return (
    <html
      lang="en"
      className="scroll-smooth"
      data-theme={theme.active}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          href="/noize-sport-font/NoizeSportFreeVertionRegular-MVwye.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased font-sans`}
      >
        <TrackingScripts />
        {children}
        <Toaster position="top-center" richColors closeButton />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
