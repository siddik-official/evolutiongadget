// ─── Facebook Feed XML Route Handler ───
// GET /facebook-feed.xml → RSS 2.0 XML feed for Meta Commerce Manager

import { generateXmlFeed } from "@/lib/facebook-feed/feed-service";

// ISR: regenerate at most once per hour
export const revalidate = 3600;

export async function GET() {
  try {
    const xml = await generateXmlFeed();

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[facebook-feed.xml] Error generating feed:", error);

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title></channel></rss>',
      {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  }
}
