import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { valueItems, type ValueItem } from "@/content/items";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { valueItemInputSchema } from "@/lib/valueItemSchema";

const collectionName = "items";

function sortByValue(items: ValueItem[]) {
  return [...items].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function toFirestoreData(item: ValueItem) {
  return Object.fromEntries(Object.entries(item).filter((entry) => entry[1] !== undefined));
}

function parseItemDocument(id: string, data: FirebaseFirestore.DocumentData): ValueItem | null {
  const parsed = valueItemInputSchema.safeParse({
    ...data,
    id: data.id ?? id,
  });

  return parsed.success ? parsed.data : null;
}

export async function getFirestoreValueItems() {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(collectionName).get();

  return sortByValue(
    snapshot.docs
      .map((doc) => parseItemDocument(doc.id, doc.data()))
      .filter((item): item is ValueItem => Boolean(item)),
  );
}

export async function getValueItems() {
  try {
    const items = await getFirestoreValueItems();

    return items.length ? items : sortByValue(valueItems);
  } catch (error) {
    console.warn("Using local value items because Firestore items could not be loaded.", error);
    return sortByValue(valueItems);
  }
}

export async function getValueItem(id: string) {
  try {
    const doc = await getFirebaseAdminDb().collection(collectionName).doc(id).get();

    if (doc.exists) {
      const item = parseItemDocument(doc.id, doc.data() ?? {});
      if (item) return item;
    }
  } catch (error) {
    console.warn(`Using local item fallback for ${id}.`, error);
  }

  return valueItems.find((item) => item.id === id) ?? null;
}

export async function saveValueItem(input: unknown) {
  const item = valueItemInputSchema.parse(input);
  const db = getFirebaseAdminDb();

  await db
    .collection(collectionName)
    .doc(item.id)
    .set({
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
  const batch = db.batch();

  valueItems.forEach((item) => {
    const ref = db.collection(collectionName).doc(item.id);
    batch.set(ref, {
      ...toFirestoreData(valueItemInputSchema.parse(item)),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return valueItems.length;
}
