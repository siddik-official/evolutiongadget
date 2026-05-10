"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

interface MarketingSettings {
  meta_pixel_enabled: string;
  meta_pixel_id: string;
  gtm_enabled: string;
  gtm_id: string;
}

export function TrackingScripts() {
  const [settings, setSettings] = useState<MarketingSettings | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings/marketing?public=true", {
          cache: "force-cache",
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch marketing settings:", error);
      }
    }
    fetchSettings();
  }, []);

  if (!settings) return null;

  const pixelEnabled =
    settings.meta_pixel_enabled === "true" && settings.meta_pixel_id;
  const gtmEnabled = settings.gtm_enabled === "true" && settings.gtm_id;

  return (
    <>
      {/* Meta Pixel */}
      {pixelEnabled && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.meta_pixel_id}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${settings.meta_pixel_id}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Google Tag Manager */}
      {gtmEnabled && (
        <>
          <Script id="gtm" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${settings.gtm_id}');
            `}
          </Script>
          {/* GTM noscript fallback - rendered via layout body tag */}
        </>
      )}
    </>
  );
}

// GTM NoScript component for body tag
export function GTMNoScript({ gtmId }: { gtmId?: string }) {
  if (!gtmId) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
