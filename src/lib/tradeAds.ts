import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

import type { DiscordSession } from "@/lib/discordAuth";
import { prisma } from "@/lib/prisma";

const maxTradeAds = 80;
const maxActiveTradeAdsPerUser = 3;
const tradeAdLifetimeMs = 24 * 60 * 60 * 1000;
const tradeAdsCacheTag = "trade-ads";
const tradeAdsReadTimeoutMs = 1200;
const tradeAdsMemoryCacheMs = 30_000;
const tradeAdsCacheRevalidateSeconds = 300;
const tradeAdsDatabaseCooldownMs = 10 * 60_000;
const tradeAdsRevalidateThrottleMs = 15_000;
const expiredTradeAdPruneIntervalMs = 60 * 60_000;
const postLimitPruneIntervalMs = 60 * 60_000;
const userPostWindowMs = 60_000;
const userPostsPerWindow = 2;
const ipPostWindowMs = 60_000;
const ipPostsPerWindow = 30;

let cachedTradeAds: { ads: TradeAd[]; timestamp: number } | null = null;
let tradeAdsDatabaseDisabledUntil = 0;
let lastTradeAdsRevalidatedAt = 0;
let lastExpiredTradeAdPrunedAt = 0;
let lastPostLimitPrunedAt = 0;

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
  const now = Date.now();

  if (now - lastTradeAdsRevalidatedAt < tradeAdsRevalidateThrottleMs) return;

  lastTradeAdsRevalidatedAt = now;
  revalidateTag(tradeAdsCacheTag, "max");
  revalidatePath("/trades");
}

export class TradePostLimitError extends Error {
  retryAfterSeconds: number;
  status: number;

  constructor(message: string, retryAfterSeconds: number, status = 429) {
    super(message);
    this.name = "TradePostLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.status = status;
  }
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
  expiresAt: string;
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
    offeringItems: data.offeringItems ?? data.offering_items ?? [],
    wants: data.wants ?? "",
    wantsItems: data.wantsItems ?? data.wants_items ?? [],
  });
  const poster = data.poster as Record<string, unknown> | null;

  if (!parsed.success || !poster?.discordId || !poster?.username) return null;

  return {
    ...parsed.data,
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : typeof data.createdAt === "string" ? data.createdAt : typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
    expiresAt: data.expiresAt instanceof Date ? data.expiresAt.toISOString() : typeof data.expiresAt === "string" ? data.expiresAt : typeof data.expires_at === "string" ? data.expires_at : new Date(Date.now() + tradeAdLifetimeMs).toISOString(),
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
    const rows = await withTimeout(
      prisma.tradeAd.findMany({
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: maxTradeAds,
      }),
      tradeAdsReadTimeoutMs,
      "Supabase trade ads read",
    );

    const ads = rows
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
  revalidate: tradeAdsCacheRevalidateSeconds,
  tags: [tradeAdsCacheTag],
});

export async function getPublicTradeAds() {
  return getCachedTradeAds();
}

function getRetryAfterSeconds(resetAt: Date) {
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
}

async function consumeTradePostLimit(key: string, maxPosts: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
    insert into trade_post_limits (key, count, reset_at, updated_at)
    values (${key}, 1, ${resetAt}, now())
    on conflict (key) do update set
      count = case
        when trade_post_limits.reset_at <= now() then 1
        else trade_post_limits.count + 1
      end,
      reset_at = case
        when trade_post_limits.reset_at <= now() then ${resetAt}
        else trade_post_limits.reset_at
      end,
      updated_at = now()
    returning count, reset_at
  `;
  const row = rows[0];

  if (row && row.count > maxPosts) {
    throw new TradePostLimitError("You're posting too quickly. Try again shortly.", getRetryAfterSeconds(row.reset_at));
  }
}

export async function assertTradePostAllowed(session: DiscordSession, clientIp: string) {
  await Promise.all([
    consumeTradePostLimit(`user:${session.id}`, userPostsPerWindow, userPostWindowMs),
    consumeTradePostLimit(`ip:${clientIp}`, ipPostsPerWindow, ipPostWindowMs),
  ]);
}

async function pruneExpiredTradeAds() {
  const now = Date.now();

  if (now - lastExpiredTradeAdPrunedAt < expiredTradeAdPruneIntervalMs) return;

  lastExpiredTradeAdPrunedAt = now;

  try {
    await prisma.tradeAd.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  } catch (error) {
    markTradeAdsDatabaseCooldown(error);
    console.warn("Unable to prune expired trade ads.", error);
  }
}

async function pruneExpiredPostLimits() {
  const now = Date.now();

  if (now - lastPostLimitPrunedAt < postLimitPruneIntervalMs) return;

  lastPostLimitPrunedAt = now;

  try {
    await prisma.tradePostLimit.deleteMany({
      where: {
        resetAt: { lt: new Date(Date.now() - postLimitPruneIntervalMs) },
      },
    });
  } catch (error) {
    markTradeAdsDatabaseCooldown(error);
    console.warn("Unable to prune old trade post limits.", error);
  }
}

export async function createTradeAd(input: unknown, session: DiscordSession) {
  const parsed = tradeAdInputSchema.parse(input);
  await Promise.all([pruneExpiredTradeAds(), pruneExpiredPostLimits()]);
  const activeAdCount = await prisma.tradeAd.count({
    where: {
      expiresAt: { gt: new Date() },
      posterDiscordId: session.id,
    },
  });

  if (activeAdCount >= maxActiveTradeAdsPerUser) {
    throw new TradePostLimitError(`You can have up to ${maxActiveTradeAdsPerUser} active trade ads at once.`, 0, 409);
  }

  const ad = {
    expiresAt: new Date(Date.now() + tradeAdLifetimeMs),
    notes: parsed.notes,
    offering: parsed.offering,
    offeringItems: parsed.offeringItems,
    poster: {
      avatar: session.avatar,
      discordId: session.id,
      username: session.username,
    },
    posterDiscordId: session.id,
    wants: parsed.wants,
    wantsItems: parsed.wantsItems,
  };
  const row = await prisma.tradeAd.create({ data: ad });

  invalidateTradeAdsCache();

  const createdAd = parseTradeAdDocument(row as Record<string, unknown>);

  if (!createdAd) throw new Error("Unable to parse created trade ad.");

  return createdAd;
}
