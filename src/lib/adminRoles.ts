import "server-only";

export type AdminRole = "owner" | "editor" | "media" | "auditor";

const roleEnv: Record<AdminRole, string> = {
  auditor: "DISCORD_AUDITOR_USER_IDS",
  editor: "DISCORD_EDITOR_USER_IDS",
  media: "DISCORD_MEDIA_USER_IDS",
  owner: "DISCORD_OWNER_USER_IDS",
};

const rolePriority: AdminRole[] = ["owner", "editor", "media", "auditor"];

function parseIds(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function getLegacyAdminIds() {
  return parseIds(process.env.DISCORD_ADMIN_USER_IDS);
}

function getRoleIds(role: AdminRole) {
  return parseIds(process.env[roleEnv[role]]);
}

export function getAdminRole(discordId: string): AdminRole | null {
  for (const role of rolePriority) {
    if (getRoleIds(role).has(discordId)) return role;
  }

  return getLegacyAdminIds().has(discordId) ? "owner" : null;
}

export function isAdminDiscordId(discordId: string) {
  return getAdminRole(discordId) !== null;
}

export function adminRoleCan(role: AdminRole | null, allowedRoles: AdminRole[]) {
  return Boolean(role && allowedRoles.includes(role));
}
