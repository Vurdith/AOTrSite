import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

import type { DiscordSession } from "@/lib/discordAuth";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";

const collectionName = "tradeAds";
const maxTradeAds = 80;
const tradeAdsCacheTag = "trade-ads";
const tradeAdsReadTimeoutMs = 1200;
const tradeAdsMemoryCacheMs = 30_000;
const tradeAdsFirestoreCooldownMs = 10 * 60_000;

let cachedTradeAds: { ads: TradeAd[]; timestamp: number } | null = null;
let tradeAdsFirestoreDisabledUntil = 0;

function isFresh(timestamp: number) {
  return Date.now() - timestamp < tradeAdsMemoryCacheMs;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function isTradeAdsFirestoreCoolingDown() {
  return Date.now() < tradeAdsFirestoreDisabledUntil;
}

function shouldCooldownFirestore(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : null;

  return code === 8 || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("timed out");
}

function markTradeAdsFirestoreCooldown(error: unknown) {
  if (shouldCooldownFirestore(error)) {
    tradeAdsFirestoreDisabledUntil = Date.now() + tradeAdsFirestoreCooldownMs;
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

function toIsoDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;

  return new Date().toISOString();
}

function parseTradeAdDocument(id: string, data: FirebaseFirestore.DocumentData): TradeAd | null {
  const parsed = tradeAdInputSchema.safeParse({
    ...data,
    offering: data.offering ?? "",
    offeringItems: data.offeringItems ?? [],
    wants: data.wants ?? "",
    wantsItems: data.wantsItems ?? [],
  });
  const poster = data.poster;

  if (!parsed.success || !poster?.discordId || !poster?.username) return null;

  return {
    ...parsed.data,
    createdAt: toIsoDate(data.createdAt),
    id,
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

  if (isTradeAdsFirestoreCoolingDown()) {
    return cachedTradeAds?.ads ?? [];
  }

  try {
    const snapshot = await withTimeout(
      getFirebaseAdminDb()
        .collection(collectionName)
        .orderBy("createdAt", "desc")
        .limit(maxTradeAds)
        .get(),
      tradeAdsReadTimeoutMs,
      "Firestore trade ads read",
    );

    const ads = snapshot.docs
      .map((doc) => parseTradeAdDocument(doc.id, doc.data()))
      .filter((ad): ad is TradeAd => Boolean(ad));

    cachedTradeAds = { ads, timestamp: Date.now() };
    return ads;
  } catch (error) {
    markTradeAdsFirestoreCooldown(error);
    console.warn("Using empty trade ads fallback because Firestore trade ads could not be loaded.", error);
    return cachedTradeAds?.ads ?? [];
  }
}

const getCachedTradeAds = unstable_cache(getTradeAds, ["public-trade-ads"], {
  revalidate: 30,
  tags: [tradeAdsCacheTag],
});

export async function getPublicTradeAds() {
  return getCachedTradeAds();
}

export async function createTradeAd(input: unknown, session: DiscordSession) {
  const parsed = tradeAdInputSchema.parse(input);
  const ref = getFirebaseAdminDb().collection(collectionName).doc();
  const ad = {
    ...parsed,
    createdAt: FieldValue.serverTimestamp(),
    poster: {
      avatar: session.avatar,
      discordId: session.id,
      username: session.username,
    },
  };

  await ref.set(ad);
  invalidateTradeAdsCache();

  return {
    ...parsed,
    createdAt: new Date().toISOString(),
    id: ref.id,
    poster: ad.poster,
  } satisfies TradeAd;
}
