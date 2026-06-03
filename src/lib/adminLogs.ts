import "server-only";

import crypto from "crypto";

import type { DiscordSession } from "@/lib/discordAuth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

const defaultLogLimit = 500;

export type AdminLogAction = "backup_exported" | "backup_restored" | "item_created" | "item_updated" | "item_deleted" | "items_seeded" | "media_uploaded" | "settings_updated";

export type AdminLog = {
  id: string;
  action: AdminLogAction;
  actor: {
    avatar: string | null;
    discordId: string;
    ipHash?: string;
    userAgent?: string;
    username: string;
  };
  createdAt: string;
  summary: string;
  targetId?: string;
  targetName?: string;
  targetType: "backup" | "item" | "items" | "media" | "settings";
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
  request?: Request;
};

function getAuditHashSecret() {
  return process.env.ADMIN_AUDIT_HASH_SECRET ?? process.env.DISCORD_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? null;
}

function hashIp(request?: Request) {
  if (!request) return undefined;

  const ip = getClientIp(request);
  const secret = getAuditHashSecret();
  if (!ip || !secret) return undefined;

  return crypto.createHmac("sha256", secret).update(ip).digest("hex").slice(0, 16);
}

function getUserAgent(request?: Request) {
  const value = request?.headers.get("user-agent")?.trim();
  if (!value) return undefined;

  return value.slice(0, 180);
}

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

  if (!data.action || !data.summary || !(data.targetType ?? data.target_type) || !actor?.discordId || !actor?.username) return null;

  return {
    action: String(data.action) as AdminLogAction,
    actor: {
      avatar: typeof actor.avatar === "string" ? actor.avatar : null,
      discordId: String(actor.discordId),
      ipHash: typeof actor.ipHash === "string" ? actor.ipHash : undefined,
      userAgent: typeof actor.userAgent === "string" ? actor.userAgent : undefined,
      username: String(actor.username),
    },
    changes: parseLogChanges(data.changes),
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : typeof data.createdAt === "string" ? data.createdAt : typeof data.created_at === "string" ? data.created_at : new Date(0).toISOString(),
    id: String(data.id),
    summary: String(data.summary),
    targetId: data.targetId ? String(data.targetId) : data.target_id ? String(data.target_id) : undefined,
    targetName: data.targetName ? String(data.targetName) : data.target_name ? String(data.target_name) : undefined,
    targetType: (data.targetType ?? data.target_type) as AdminLog["targetType"],
  };
}

export async function createAdminLog({ action, actor, changes, request, summary, targetId, targetName, targetType }: CreateAdminLogInput) {
  await prisma.adminLog.create({
    data: {
      action,
      actor: {
        avatar: actor.avatar,
        discordId: actor.id,
        ipHash: hashIp(request),
        userAgent: getUserAgent(request),
        username: actor.username,
      },
      changes,
      summary,
      targetId: targetId ?? null,
      targetName: targetName ?? null,
      targetType,
    },
  });
}

export async function getAdminLogs(limit = defaultLogLimit) {
  const rows = await prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });

  return rows
    .map((row) => parseLogDocument(row as Record<string, unknown>))
    .filter((log): log is AdminLog => Boolean(log));
}
