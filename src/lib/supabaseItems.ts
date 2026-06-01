import "server-only";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { valueItems, type ValueItem } from "@/content/items";
import { prisma } from "@/lib/prisma";
import { valueItemInputSchema } from "@/lib/valueItemSchema";
import { defaultValueCurrencySettings, getCurrencyValues, sanitizeCurrencySettings, type ValueCurrencySettings } from "@/lib/valueCurrency";

const marketSettingsDocumentId = "market";
const publicReadTimeoutMs = 1800;
const publicCacheMs = 300_000;
const databaseCooldownMs = 10 * 60_000;
const valueItemsCacheTag = "value-items";
const valueSettingsCacheTag = "value-settings";

let cachedItems: { items: ValueItem[]; timestamp: number } | null = null;
let cachedSettings: { settings: ValueCurrencySettings; timestamp: number } | null = null;
let databaseDisabledUntil = 0;

function isFresh(timestamp: number) {
  return Date.now() - timestamp < publicCacheMs;
}

function getStaticValueItems(settings: ValueCurrencySettings = defaultValueCurrencySettings) {
  return sortByValue(valueItems.map((item) => withCurrencyValues(item, settings)));
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string) {
  const resolvedPromise = Promise.resolve(promise);

  if (!timeoutMs) return resolvedPromise;

  return Promise.race([
    resolvedPromise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function isDatabaseCoolingDown() {
  return Date.now() < databaseDisabledUntil;
}

function shouldCooldownDatabase(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : null;

  return code === 8 || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("rate limit") || message.includes("timed out");
}

function markDatabaseCooldown(error: unknown) {
  if (shouldCooldownDatabase(error)) {
    databaseDisabledUntil = Date.now() + databaseCooldownMs;
  }
}

function invalidatePublicValueCache(itemId?: string) {
  cachedItems = null;
  cachedSettings = null;
  revalidateTag(valueItemsCacheTag, "max");
  revalidateTag(valueSettingsCacheTag, "max");
  revalidatePath("/values");
  revalidatePath("/calculator");
  revalidatePath("/trades");
  revalidatePath("/updates");
  if (itemId) revalidatePath(`/items/${itemId}`);
}

function sortByValue(items: ValueItem[]) {
  return [...items].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function toSupabaseData(item: ValueItem) {
  return Object.fromEntries(Object.entries(item).filter((entry) => entry[1] !== undefined)) as Prisma.InputJsonObject;
}

function withCurrencyValues(item: ValueItem, settings: ValueCurrencySettings) {
  const valueKeys = Number(item.valueKeys ?? item.value);

  return {
    ...item,
    value: valueKeys,
    ...getCurrencyValues(valueKeys, settings),
  };
}

function parseItemDocument(id: string, data: Record<string, unknown>): ValueItem | null {
  const parsed = valueItemInputSchema.safeParse({
    ...data,
    id: data.id ?? id,
  });

  return parsed.success ? parsed.data : null;
}

function withRecordedValueHistory(item: ValueItem, previous?: ValueItem | null) {
  const history = [...(item.valueHistory ?? [])]
    .filter((point) => point.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const shouldRecordSnapshot = !history.length || !previous || previous.value !== item.value;

  if (!shouldRecordSnapshot) return { ...item, valueHistory: history };

  history.push({ date: new Date().toISOString(), value: item.value });

  return {
    ...item,
    valueHistory: history.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getDatabaseValueItems(options: { timeoutMs?: number } = {}) {
  const [settings, rows] = await Promise.all([
    getValueCurrencySettings(options),
    withTimeout(prisma.valueItem.findMany({ select: { data: true, id: true } }), options.timeoutMs ?? 0, "Supabase items read"),
  ]);

  return sortByValue(
    rows
      .map((row) => parseItemDocument(row.id, (row.data ?? {}) as Record<string, unknown>))
      .filter((item): item is ValueItem => Boolean(item)),
  ).map((item) => withCurrencyValues(item, settings));
}

export async function getValueItems() {
  if (cachedItems && isFresh(cachedItems.timestamp)) {
    return cachedItems.items;
  }

  if (isDatabaseCoolingDown()) {
    const settings = await getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs });
    const fallbackItems = getStaticValueItems(settings);
    cachedItems = { items: fallbackItems, timestamp: Date.now() };
    return fallbackItems;
  }

  try {
    const items = await getDatabaseValueItems({ timeoutMs: publicReadTimeoutMs });

    if (items.length) {
      cachedItems = { items, timestamp: Date.now() };
      return items;
    }

    const settings = await getValueCurrencySettings();
    const fallbackItems = getStaticValueItems(settings);
    cachedItems = { items: fallbackItems, timestamp: Date.now() };
    return fallbackItems;
  } catch (error) {
    markDatabaseCooldown(error);
    console.warn("Using local value items because Supabase items could not be loaded.", error);
    const settings = await getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs });
    const fallbackItems = getStaticValueItems(settings);
    cachedItems = { items: fallbackItems, timestamp: Date.now() };
    return fallbackItems;
  }
}

const getCachedValueItems = unstable_cache(getValueItems, ["public-value-items"], {
  revalidate: false,
  tags: [valueItemsCacheTag, valueSettingsCacheTag],
});

export async function getPublicValueItems() {
  return getCachedValueItems();
}

export async function getValueItem(id: string) {
  const cachedList = await getPublicValueItems();
  const cachedItem = cachedList.find((item) => item.id === id);

  if (cachedItem) return cachedItem;

  try {
    if (isDatabaseCoolingDown()) {
      throw new Error("Supabase public reads are cooling down after database errors.");
    }

    const [settings, row] = await Promise.all([
      getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs }),
      withTimeout(prisma.valueItem.findUnique({ select: { data: true, id: true }, where: { id } }), publicReadTimeoutMs, "Supabase item read"),
    ]);

    if (row) {
      const item = parseItemDocument(row.id, (row.data ?? {}) as Record<string, unknown>);
      if (item) return withCurrencyValues(item, settings);
    }
  } catch (error) {
    markDatabaseCooldown(error);
    console.warn(`Using local item fallback for ${id}.`, error);
  }

  const localItem = valueItems.find((item) => item.id === id) ?? null;
  if (!localItem) return null;

  return withCurrencyValues(localItem, await getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs }));
}

export async function saveValueItem(input: unknown) {
  const parsedItem = valueItemInputSchema.parse(input);
  const settings = await getValueCurrencySettings({ timeoutMs: 0 });
  const existing = await prisma.valueItem.findUnique({ select: { data: true, id: true }, where: { id: parsedItem.id } });
  const previous = existing ? parseItemDocument(existing.id, (existing.data ?? {}) as Record<string, unknown>) : null;
  const item = withRecordedValueHistory(withCurrencyValues(parsedItem, settings), previous);

  await prisma.valueItem.upsert({
    create: { data: toSupabaseData(item), id: item.id },
    update: { data: toSupabaseData(item) },
    where: { id: item.id },
  });

  cachedItems = null;
  invalidatePublicValueCache(item.id);
  return item;
}

export async function deleteValueItem(id: string) {
  await prisma.valueItem.deleteMany({ where: { id } });

  cachedItems = null;
  invalidatePublicValueCache(id);
}

export async function seedValueItems() {
  const settings = await getValueCurrencySettings({ timeoutMs: 0 });
  const rows = valueItems.map((item) => {
    const parsedItem = valueItemInputSchema.parse(withCurrencyValues(item, settings));
    const recordedItem = withRecordedValueHistory(parsedItem);

    return {
      data: toSupabaseData(recordedItem),
      id: recordedItem.id,
    };
  });

  await prisma.$transaction(
    rows.map((row) =>
      prisma.valueItem.upsert({
        create: row,
        update: { data: row.data },
        where: { id: row.id },
      }),
    ),
  );

  cachedItems = null;
  invalidatePublicValueCache();
  return valueItems.length;
}

export async function getValueCurrencySettings(options: { timeoutMs?: number } = {}) {
  if (options.timeoutMs !== 0 && cachedSettings && isFresh(cachedSettings.timestamp)) {
    return cachedSettings.settings;
  }

  if (options.timeoutMs !== 0 && isDatabaseCoolingDown()) {
    const settings = cachedSettings?.settings ?? defaultValueCurrencySettings;
    cachedSettings = { settings, timestamp: Date.now() };
    return settings;
  }

  try {
    const row = await withTimeout(
      prisma.valueSetting.findUnique({ select: { data: true }, where: { id: marketSettingsDocumentId } }),
      options.timeoutMs ?? publicReadTimeoutMs,
      "Supabase settings read",
    );

    const settings = sanitizeCurrencySettings((row?.data ?? defaultValueCurrencySettings) as Partial<ValueCurrencySettings>);
    cachedSettings = { settings, timestamp: Date.now() };
    return settings;
  } catch (error) {
    markDatabaseCooldown(error);
    console.warn("Using default value currency settings because Supabase settings could not be loaded.", error);
    cachedSettings = { settings: defaultValueCurrencySettings, timestamp: Date.now() };
    return defaultValueCurrencySettings;
  }
}

const getCachedValueCurrencySettings = unstable_cache(() => getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs }), ["public-value-currency-settings"], {
  revalidate: false,
  tags: [valueSettingsCacheTag],
});

export async function getPublicValueCurrencySettings() {
  return getCachedValueCurrencySettings();
}

export async function saveValueCurrencySettings(input: unknown) {
  const settings = sanitizeCurrencySettings(input as Partial<ValueCurrencySettings>);

  await prisma.valueSetting.upsert({
    create: { data: settings, id: marketSettingsDocumentId },
    update: { data: settings },
    where: { id: marketSettingsDocumentId },
  });

  cachedSettings = { settings, timestamp: Date.now() };
  cachedItems = null;
  invalidatePublicValueCache();
  return settings;
}
