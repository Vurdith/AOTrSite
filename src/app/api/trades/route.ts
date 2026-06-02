import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getDiscordSession } from "@/lib/discordAuth";
import { assertTradePostAllowed, createTradeAd, getPublicTradeAds, TradePostLimitError } from "@/lib/tradeAds";

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
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
  const session = await getDiscordSession();

  if (!session) {
    return NextResponse.json({ error: "Discord login required." }, { status: 401 });
  }

  try {
    await assertTradePostAllowed(session, getClientIp(request));

    const ad = await createTradeAd(await request.json(), session);

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid trade ad." }, { status: 400 });
    }

    if (error instanceof TradePostLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        {
          headers: error.retryAfterSeconds ? { "Retry-After": String(error.retryAfterSeconds) } : undefined,
          status: error.status,
        },
      );
    }

    console.error("Unable to create trade ad.", error);
    return NextResponse.json({ error: "Unable to create trade ad." }, { status: 500 });
  }
}
