import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { valueItems, type ValueItem } from "@/content/items";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { valueItemInputSchema } from "@/lib/valueItemSchema";
import { defaultValueCurrencySettings, getCurrencyValues, sanitizeCurrencySettings, type ValueCurrencySettings } from "@/lib/valueCurrency";

const collectionName = "items";
const settingsCollectionName = "settings";
const marketSettingsDocumentId = "market";
const publicReadTimeoutMs = 1800;
const publicCacheMs = 300_000;
const firestoreCooldownMs = 10 * 60_000;
const valueItemsCacheTag = "value-items";
const valueSettingsCacheTag = "value-settings";

let cachedItems: { items: ValueItem[]; timestamp: number } | null = null;
let cachedSettings: { settings: ValueCurrencySettings; timestamp: number } | null = null;
let firestoreDisabledUntil = 0;

function isFresh(timestamp: number) {
  return Date.now() - timestamp < publicCacheMs;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  if (!timeoutMs) return promise;

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function isFirestoreCoolingDown() {
  return Date.now() < firestoreDisabledUntil;
}

function shouldCooldownFirestore(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : null;

  return code === 8 || message.includes("RESOURCE_EXHAUSTED") || message.includes("Quota exceeded") || message.includes("timed out");
}

function markFirestoreCooldown(error: unknown) {
  if (shouldCooldownFirestore(error)) {
    firestoreDisabledUntil = Date.now() + firestoreCooldownMs;
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

function toFirestoreData(item: ValueItem) {
  return Object.fromEntries(Object.entries(item).filter((entry) => entry[1] !== undefined));
}

function withCurrencyValues(item: ValueItem, settings: ValueCurrencySettings) {
  const valueKeys = Number(item.valueKeys ?? item.value);

  return {
    ...item,
    value: valueKeys,
    ...getCurrencyValues(valueKeys, settings),
  };
}

function parseItemDocument(id: string, data: FirebaseFirestore.DocumentData): ValueItem | null {
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

export async function getFirestoreValueItems(options: { timeoutMs?: number } = {}) {
  const db = getFirebaseAdminDb();
  const [settings, snapshot] = await Promise.all([
    getValueCurrencySettings(options),
    withTimeout(db.collection(collectionName).get(), options.timeoutMs ?? 0, "Firestore items read"),
  ]);

  return sortByValue(
    snapshot.docs
      .map((doc) => parseItemDocument(doc.id, doc.data()))
      .filter((item): item is ValueItem => Boolean(item)),
  ).map((item) => withCurrencyValues(item, settings));
}

export async function getValueItems() {
  if (cachedItems && isFresh(cachedItems.timestamp)) {
    return cachedItems.items;
  }

  if (isFirestoreCoolingDown()) {
    const settings = await getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs });
    const fallbackItems = sortByValue(valueItems.map((item) => withCurrencyValues(item, settings)));
    cachedItems = { items: fallbackItems, timestamp: Date.now() };
    return fallbackItems;
  }

  try {
    const items = await getFirestoreValueItems({ timeoutMs: publicReadTimeoutMs });

    if (items.length) {
      cachedItems = { items, timestamp: Date.now() };
      return items;
    }

    const settings = await getValueCurrencySettings();
    const fallbackItems = sortByValue(valueItems.map((item) => withCurrencyValues(item, settings)));
    cachedItems = { items: fallbackItems, timestamp: Date.now() };
    return fallbackItems;
  } catch (error) {
    markFirestoreCooldown(error);
    console.warn("Using local value items because Firestore items could not be loaded.", error);
    const settings = await getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs });
    const fallbackItems = sortByValue(valueItems.map((item) => withCurrencyValues(item, settings)));
    cachedItems = { items: fallbackItems, timestamp: Date.now() };
    return fallbackItems;
  }
}

const getCachedValueItems = unstable_cache(getValueItems, ["public-value-items"], {
  revalidate: 300,
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
    if (isFirestoreCoolingDown()) {
      throw new Error("Firestore public reads are cooling down after quota errors.");
    }

    const db = getFirebaseAdminDb();
    const [settings, doc] = await Promise.all([getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs }), withTimeout(db.collection(collectionName).doc(id).get(), publicReadTimeoutMs, "Firestore item read")]);

    if (doc.exists) {
      const item = parseItemDocument(doc.id, doc.data() ?? {});
      if (item) return withCurrencyValues(item, settings);
    }
  } catch (error) {
    markFirestoreCooldown(error);
    console.warn(`Using local item fallback for ${id}.`, error);
  }

  const localItem = valueItems.find((item) => item.id === id) ?? null;
  if (!localItem) return null;

  return withCurrencyValues(localItem, await getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs }));
}

export async function saveValueItem(input: unknown) {
  const parsedItem = valueItemInputSchema.parse(input);
  const db = getFirebaseAdminDb();
  const settings = await getValueCurrencySettings({ timeoutMs: 0 });
  const ref = db.collection(collectionName).doc(parsedItem.id);
  const existing = await ref.get();
  const previous = existing.exists ? parseItemDocument(existing.id, existing.data() ?? {}) : null;
  const item = withRecordedValueHistory(withCurrencyValues(parsedItem, settings), previous);

  await ref.set({
    ...toFirestoreData(item),
    updatedAt: FieldValue.serverTimestamp(),
  });

  cachedItems = null;
  invalidatePublicValueCache(item.id);
  return item;
}

export async function deleteValueItem(id: string) {
  await getFirebaseAdminDb().collection(collectionName).doc(id).delete();
  cachedItems = null;
  invalidatePublicValueCache(id);
}

export async function seedValueItems() {
  const db = getFirebaseAdminDb();
  const settings = await getValueCurrencySettings({ timeoutMs: 0 });
  const batch = db.batch();

  valueItems.forEach((item) => {
    const ref = db.collection(collectionName).doc(item.id);
    const parsedItem = valueItemInputSchema.parse(withCurrencyValues(item, settings));
    batch.set(ref, {
      ...toFirestoreData(withRecordedValueHistory(parsedItem)),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  cachedItems = null;
  invalidatePublicValueCache();
  return valueItems.length;
}

export async function getValueCurrencySettings(options: { timeoutMs?: number } = {}) {
  if (options.timeoutMs !== 0 && cachedSettings && isFresh(cachedSettings.timestamp)) {
    return cachedSettings.settings;
  }

  if (options.timeoutMs !== 0 && isFirestoreCoolingDown()) {
    const settings = cachedSettings?.settings ?? defaultValueCurrencySettings;
    cachedSettings = { settings, timestamp: Date.now() };
    return settings;
  }

  try {
    const doc = await withTimeout(getFirebaseAdminDb().collection(settingsCollectionName).doc(marketSettingsDocumentId).get(), options.timeoutMs ?? publicReadTimeoutMs, "Firestore settings read");

    const settings = sanitizeCurrencySettings(doc.exists ? doc.data() : defaultValueCurrencySettings);
    cachedSettings = { settings, timestamp: Date.now() };
    return settings;
  } catch (error) {
    markFirestoreCooldown(error);
    console.warn("Using default value currency settings because Firestore settings could not be loaded.", error);
    cachedSettings = { settings: defaultValueCurrencySettings, timestamp: Date.now() };
    return defaultValueCurrencySettings;
  }
}

const getCachedValueCurrencySettings = unstable_cache(() => getValueCurrencySettings({ timeoutMs: publicReadTimeoutMs }), ["public-value-currency-settings"], {
  revalidate: 300,
  tags: [valueSettingsCacheTag],
});

export async function getPublicValueCurrencySettings() {
  return getCachedValueCurrencySettings();
}

export async function saveValueCurrencySettings(input: unknown) {
  const settings = sanitizeCurrencySettings(input as Partial<ValueCurrencySettings>);

  await getFirebaseAdminDb()
    .collection(settingsCollectionName)
    .doc(marketSettingsDocumentId)
    .set({
      ...settings,
      updatedAt: FieldValue.serverTimestamp(),
    });

  cachedSettings = { settings, timestamp: Date.now() };
  cachedItems = null;
  invalidatePublicValueCache();
  return settings;
}
