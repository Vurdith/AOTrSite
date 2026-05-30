import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { valueItems, type ValueItem } from "@/content/items";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { valueItemInputSchema } from "@/lib/valueItemSchema";
import { defaultValueCurrencySettings, getCurrencyValues, sanitizeCurrencySettings, type ValueCurrencySettings } from "@/lib/valueCurrency";

const collectionName = "items";
const settingsCollectionName = "settings";
const marketSettingsDocumentId = "market";

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

export async function getFirestoreValueItems() {
  const db = getFirebaseAdminDb();
  const settings = await getValueCurrencySettings();
  const snapshot = await db.collection(collectionName).get();

  return sortByValue(
    snapshot.docs
      .map((doc) => parseItemDocument(doc.id, doc.data()))
      .filter((item): item is ValueItem => Boolean(item)),
  ).map((item) => withCurrencyValues(item, settings));
}

export async function getValueItems() {
  try {
    const items = await getFirestoreValueItems();

    if (items.length) return items;

    const settings = await getValueCurrencySettings();
    return sortByValue(valueItems.map((item) => withCurrencyValues(item, settings)));
  } catch (error) {
    console.warn("Using local value items because Firestore items could not be loaded.", error);
    const settings = await getValueCurrencySettings();
    return sortByValue(valueItems.map((item) => withCurrencyValues(item, settings)));
  }
}

export async function getValueItem(id: string) {
  try {
    const db = getFirebaseAdminDb();
    const [settings, doc] = await Promise.all([getValueCurrencySettings(), db.collection(collectionName).doc(id).get()]);

    if (doc.exists) {
      const item = parseItemDocument(doc.id, doc.data() ?? {});
      if (item) return withCurrencyValues(item, settings);
    }
  } catch (error) {
    console.warn(`Using local item fallback for ${id}.`, error);
  }

  const localItem = valueItems.find((item) => item.id === id) ?? null;
  if (!localItem) return null;

  return withCurrencyValues(localItem, await getValueCurrencySettings());
}

export async function saveValueItem(input: unknown) {
  const parsedItem = valueItemInputSchema.parse(input);
  const db = getFirebaseAdminDb();
  const settings = await getValueCurrencySettings();
  const ref = db.collection(collectionName).doc(parsedItem.id);
  const existing = await ref.get();
  const previous = existing.exists ? parseItemDocument(existing.id, existing.data() ?? {}) : null;
  const item = withRecordedValueHistory(withCurrencyValues(parsedItem, settings), previous);

  await ref.set({
    ...toFirestoreData(item),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return item;
}

export async function deleteValueItem(id: string) {
  await getFirebaseAdminDb().collection(collectionName).doc(id).delete();
}

export async function seedValueItems() {
  const db = getFirebaseAdminDb();
  const settings = await getValueCurrencySettings();
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

  return valueItems.length;
}

export async function getValueCurrencySettings() {
  try {
    const doc = await getFirebaseAdminDb().collection(settingsCollectionName).doc(marketSettingsDocumentId).get();

    return sanitizeCurrencySettings(doc.exists ? doc.data() : defaultValueCurrencySettings);
  } catch (error) {
    console.warn("Using default value currency settings because Firestore settings could not be loaded.", error);
    return defaultValueCurrencySettings;
  }
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

  return settings;
}
