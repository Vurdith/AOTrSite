import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

import type { DiscordSession } from "@/lib/discordAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const tradeAdsTable = "trade_ads";
const maxTradeAds = 80;
const tradeAdsCacheTag = "trade-ads";
const tradeAdsReadTimeoutMs = 1200;
const tradeAdsMemoryCacheMs = 30_000;
const tradeAdsDatabaseCooldownMs = 10 * 60_000;

let cachedTradeAds: { ads: TradeAd[]; timestamp: number } | null = null;
let tradeAdsDatabaseDisabledUntil = 0;

function isFresh(timestamp: number) {
  return Date.now() - timestamp < tradeAdsMemoryCacheMs;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string) {
  const resolvedPromise = Promise.resolve(promise);

  return Promise.race([
    resolvedPromise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function isTradeAdsDatabaseCoolingDown() {
  return Date.now() < tradeAdsDatabaseDisabledUntil;
}

function shouldCooldownDatabase(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : null;

  return code === 8 || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("rate limit") || message.includes("timed out");
}

function markTradeAdsDatabaseCooldown(error: unknown) {
  if (shouldCooldownDatabase(error)) {
    tradeAdsDatabaseDisabledUntil = Date.now() + tradeAdsDatabaseCooldownMs;
  }
}

function invalidateTradeAdsCache() {
  cachedTradeAds = null;
  revalidateTag(tradeAdsCacheTag, "max");
  revalidatePath("/trades");
}

const tradeAdItemSchema = z.object({
  iconUrl: z.string().optional(),
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(99).default(1),
  rarity: z.string().trim().min(1).max(40),
});

const tradeAdInputSchema = z.object({
  offering: z.string().trim().max(240).optional().default(""),
  offeringItems: z.array(tradeAdItemSchema).max(9).optional().default([]),
  notes: z.string().trim().max(480).optional().default(""),
  wants: z.string().trim().max(240).optional().default(""),
  wantsItems: z.array(tradeAdItemSchema).max(9).optional().default([]),
}).refine((value) => value.offering || value.wants || value.offeringItems.length || value.wantsItems.length, {
  message: "Add at least one offering or looking-for item.",
});

export type TradeAdInput = z.infer<typeof tradeAdInputSchema>;
export type TradeAdItem = z.infer<typeof tradeAdItemSchema>;

export type TradeAd = TradeAdInput & {
  createdAt: string;
  id: string;
  poster: {
    avatar: string | null;
    discordId: string;
    username: string;
  };
};

function parseTradeAdDocument(data: Record<string, unknown>): TradeAd | null {
  const parsed = tradeAdInputSchema.safeParse({
    ...data,
    offering: data.offering ?? "",
    offeringItems: data.offering_items ?? [],
    wants: data.wants ?? "",
    wantsItems: data.wants_items ?? [],
  });
  const poster = data.poster as Record<string, unknown> | null;

  if (!parsed.success || !poster?.discordId || !poster?.username) return null;

  return {
    ...parsed.data,
    createdAt: typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
    id: String(data.id),
    poster: {
      avatar: typeof poster.avatar === "string" ? poster.avatar : null,
      discordId: String(poster.discordId),
      username: String(poster.username),
    },
  };
}

export async function getTradeAds() {
  if (cachedTradeAds && isFresh(cachedTradeAds.timestamp)) {
    return cachedTradeAds.ads;
  }

  if (isTradeAdsDatabaseCoolingDown()) {
    return cachedTradeAds?.ads ?? [];
  }

  try {
    const response = await withTimeout(
      getSupabaseAdmin()
        .from(tradeAdsTable)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(maxTradeAds),
      tradeAdsReadTimeoutMs,
      "Supabase trade ads read",
    );

    if (response.error) throw response.error;

    const ads = (response.data ?? [])
      .map((row) => parseTradeAdDocument(row as Record<string, unknown>))
      .filter((ad): ad is TradeAd => Boolean(ad));

    cachedTradeAds = { ads, timestamp: Date.now() };
    return ads;
  } catch (error) {
    markTradeAdsDatabaseCooldown(error);
    console.warn("Using empty trade ads fallback because Supabase trade ads could not be loaded.", error);
    return cachedTradeAds?.ads ?? [];
  }
}

const getCachedTradeAds = unstable_cache(getTradeAds, ["public-trade-ads"], {
  revalidate: false,
  tags: [tradeAdsCacheTag],
});

export async function getPublicTradeAds() {
  return getCachedTradeAds();
}

export async function createTradeAd(input: unknown, session: DiscordSession) {
  const parsed = tradeAdInputSchema.parse(input);
  const ad = {
    notes: parsed.notes,
    offering: parsed.offering,
    offering_items: parsed.offeringItems,
    poster: {
      avatar: session.avatar,
      discordId: session.id,
      username: session.username,
    },
    wants: parsed.wants,
    wants_items: parsed.wantsItems,
  };
  const response = await getSupabaseAdmin().from(tradeAdsTable).insert(ad).select("*").single();

  if (response.error) throw response.error;

  invalidateTradeAdsCache();

  const createdAd = parseTradeAdDocument(response.data as Record<string, unknown>);

  if (!createdAd) throw new Error("Unable to parse created trade ad.");

  return createdAd;
}
