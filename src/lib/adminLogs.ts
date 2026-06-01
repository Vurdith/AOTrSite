import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import type { DiscordSession } from "@/lib/discordAuth";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";

const collectionName = "adminLogs";
const defaultLogLimit = 500;

export type AdminLogAction = "item_created" | "item_updated" | "item_deleted" | "items_seeded" | "media_uploaded" | "settings_updated";

export type AdminLog = {
  id: string;
  action: AdminLogAction;
  actor: {
    avatar: string | null;
    discordId: string;
    username: string;
  };
  createdAt: string;
  summary: string;
  targetId?: string;
  targetName?: string;
  targetType: "item" | "items" | "media" | "settings";
  changes: AdminLogChange[];
};

export type AdminLogChange = {
  after: string | null;
  before: string | null;
  field: string;
  label: string;
};

type CreateAdminLogInput = Omit<AdminLog, "actor" | "createdAt" | "id"> & {
  actor: DiscordSession;
};

function parseLogChanges(value: unknown): AdminLogChange[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((change) => {
      if (!change || typeof change !== "object") return null;

      const record = change as Record<string, unknown>;

      if (!record.field || !record.label) return null;

      return {
        after: record.after === null || record.after === undefined ? null : String(record.after),
        before: record.before === null || record.before === undefined ? null : String(record.before),
        field: String(record.field),
        label: String(record.label),
      };
    })
    .filter((change): change is AdminLogChange => Boolean(change));
}

function parseLogDocument(id: string, data: FirebaseFirestore.DocumentData): AdminLog | null {
  const actor = data.actor;

  if (!data.action || !data.summary || !data.targetType || !actor?.discordId || !actor?.username) return null;

  return {
    action: data.action,
    actor: {
      avatar: typeof actor.avatar === "string" ? actor.avatar : null,
      discordId: String(actor.discordId),
      username: String(actor.username),
    },
    changes: parseLogChanges(data.changes),
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
    id,
    summary: String(data.summary),
    targetId: data.targetId ? String(data.targetId) : undefined,
    targetName: data.targetName ? String(data.targetName) : undefined,
    targetType: data.targetType,
  };
}

export async function createAdminLog({ action, actor, changes, summary, targetId, targetName, targetType }: CreateAdminLogInput) {
  await getFirebaseAdminDb()
    .collection(collectionName)
    .add({
      action,
      actor: {
        avatar: actor.avatar,
        discordId: actor.id,
        username: actor.username,
      },
      changes,
      createdAt: FieldValue.serverTimestamp(),
      summary,
      targetId: targetId ?? null,
      targetName: targetName ?? null,
      targetType,
    });
}

export async function getAdminLogs(limit = defaultLogLimit) {
  const snapshot = await getFirebaseAdminDb()
    .collection(collectionName)
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(limit, 1), 500))
    .get();

  return snapshot.docs
    .map((doc) => parseLogDocument(doc.id, doc.data()))
    .filter((log): log is AdminLog => Boolean(log));
}
