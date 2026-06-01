import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getDiscordSession } from "@/lib/discordAuth";
import { createTradeAd, getPublicTradeAds, isTradeAdsStaticMode } from "@/lib/tradeAds";

const postWindowMs = 60_000;
const maxPostsPerWindow = 3;
const postBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request, userId: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return `${userId}:${forwardedFor || "local"}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = postBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    postBuckets.set(key, { count: 1, resetAt: now + postWindowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxPostsPerWindow;
}

export async function GET() {
  const ads = await getPublicTradeAds();

  return NextResponse.json(
    { ads },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}

export async function POST(request: Request) {
  if (isTradeAdsStaticMode()) {
    return NextResponse.json({ error: "Trade ads are temporarily unavailable." }, { status: 503 });
  }

  const session = await getDiscordSession();

  if (!session) {
    return NextResponse.json({ error: "Discord login required." }, { status: 401 });
  }

  if (isRateLimited(getClientKey(request, session.id))) {
    return NextResponse.json({ error: "You're posting too quickly. Try again in a minute." }, { status: 429 });
  }

  try {
    const ad = await createTradeAd(await request.json(), session);

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid trade ad." }, { status: 400 });
    }

    console.error("Unable to create trade ad.", error);
    return NextResponse.json({ error: "Unable to create trade ad." }, { status: 500 });
  }
}
