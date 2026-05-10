// ─── Facebook Feed JSON Route Handler ───
// GET /facebook-feed.json → JSON feed for Meta Commerce Manager

import { generateJsonFeed } from "@/lib/facebook-feed/feed-service";

// ISR: regenerate at most once per hour
export const revalidate = 3600;

export async function GET() {
  try {
    const feed = await generateJsonFeed();

    return new Response(JSON.stringify(feed, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[facebook-feed.json] Error generating feed:", error);

    return new Response(JSON.stringify({ error: "Failed to generate feed" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
