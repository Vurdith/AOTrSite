import "server-only";

import type { DiscordSession } from "@/lib/discordAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const adminLogsTable = "admin_logs";
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

function parseLogDocument(data: Record<string, unknown>): AdminLog | null {
  const actor = data.actor as Record<string, unknown> | null;

  if (!data.action || !data.summary || !data.target_type || !actor?.discordId || !actor?.username) return null;

  return {
    action: String(data.action) as AdminLogAction,
    actor: {
      avatar: typeof actor.avatar === "string" ? actor.avatar : null,
      discordId: String(actor.discordId),
      username: String(actor.username),
    },
    changes: parseLogChanges(data.changes),
    createdAt: typeof data.created_at === "string" ? data.created_at : new Date(0).toISOString(),
    id: String(data.id),
    summary: String(data.summary),
    targetId: data.target_id ? String(data.target_id) : undefined,
    targetName: data.target_name ? String(data.target_name) : undefined,
    targetType: data.target_type as AdminLog["targetType"],
  };
}

export async function createAdminLog({ action, actor, changes, summary, targetId, targetName, targetType }: CreateAdminLogInput) {
  const response = await getSupabaseAdmin()
    .from(adminLogsTable)
    .insert({
      action,
      actor: {
        avatar: actor.avatar,
        discordId: actor.id,
        username: actor.username,
      },
      changes,
      summary,
      target_id: targetId ?? null,
      target_name: targetName ?? null,
      target_type: targetType,
    });

  if (response.error) throw response.error;
}

export async function getAdminLogs(limit = defaultLogLimit) {
  const response = await getSupabaseAdmin()
    .from(adminLogsTable)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (response.error) throw response.error;

  return (response.data ?? [])
    .map((row) => parseLogDocument(row as Record<string, unknown>))
    .filter((log): log is AdminLog => Boolean(log));
}
