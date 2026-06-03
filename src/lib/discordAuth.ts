import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

import { adminRoleCan, getAdminRole, isAdminDiscordId, type AdminRole } from "@/lib/adminRoles";

const sessionCookieName = "aotr_discord_session";
const stateCookieName = "aotr_discord_oauth_state";
const returnToCookieName = "aotr_discord_return_to";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type DiscordSession = {
  adminRole: AdminRole | null;
  avatar: string | null;
  discriminator: string | null;
  id: string;
  isAdmin: boolean;
  username: string;
};

type DiscordUser = {
  avatar: string | null;
  discriminator: string | null;
  global_name?: string | null;
  id: string;
  username: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

function getSessionSecret() {
  const explicitSecret = process.env.DISCORD_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;

  if (explicitSecret) return explicitSecret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing DISCORD_SESSION_SECRET or ADMIN_SESSION_SECRET environment variable.");
  }

  return process.env.DISCORD_CLIENT_SECRET || "";
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("Missing DISCORD_SESSION_SECRET, ADMIN_SESSION_SECRET, or DISCORD_CLIENT_SECRET environment variable.");
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function getWhitelistedDiscordIds() {
  return new Set(
    (process.env.DISCORD_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function sanitizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const baseUrl = "https://aotr.local";
    const parsed = new URL(value, baseUrl);

    if (parsed.origin !== baseUrl) {
      return "/";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function isWhitelistedDiscordUser(discordId: string) {
  return isAdminDiscordId(discordId) || getWhitelistedDiscordIds().has(discordId);
}

export function getDiscordLoginUrl() {
  const clientId = getRequiredEnv("DISCORD_CLIENT_ID");
  const redirectUri = getRequiredEnv("DISCORD_REDIRECT_URI");
  const state = crypto.randomBytes(16).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });

  return {
    state,
    url: `https://discord.com/oauth2/authorize?${params.toString()}`,
  };
}

export function createDiscordSession(user: DiscordUser): DiscordSession {
  return {
    avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null,
    adminRole: getAdminRole(user.id) ?? (getWhitelistedDiscordIds().has(user.id) ? "owner" : null),
    discriminator: user.discriminator,
    id: user.id,
    isAdmin: isWhitelistedDiscordUser(user.id),
    username: user.global_name || user.username,
  };
}

export function encodeDiscordSession(session: DiscordSession) {
  const payload = base64url(JSON.stringify(session));
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function decodeDiscordSession(value?: string): DiscordSession | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");

  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DiscordSession;

    if (!parsed.id || !parsed.username) {
      return null;
    }

    return {
      ...parsed,
      adminRole: getAdminRole(parsed.id) ?? (getWhitelistedDiscordIds().has(parsed.id) ? "owner" : null),
      isAdmin: isWhitelistedDiscordUser(parsed.id),
    };
  } catch {
    return null;
  }
}

export async function getDiscordSession() {
  const cookieStore = await cookies();

  return decodeDiscordSession(cookieStore.get(sessionCookieName)?.value);
}

export async function setDiscordSession(session: DiscordSession) {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, encodeDiscordSession(session), {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearDiscordSession() {
  const cookieStore = await cookies();

  cookieStore.delete(sessionCookieName);
}

export async function setDiscordOAuthState(state: string, returnTo: string) {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set(stateCookieName, state, cookieOptions);
  cookieStore.set(returnToCookieName, sanitizeReturnTo(returnTo), cookieOptions);
}

export async function consumeDiscordOAuthState() {
  const cookieStore = await cookies();
  const state = cookieStore.get(stateCookieName)?.value ?? null;
  const returnTo = sanitizeReturnTo(cookieStore.get(returnToCookieName)?.value ?? null);

  cookieStore.delete(stateCookieName);
  cookieStore.delete(returnToCookieName);

  return { returnTo, state };
}

export async function exchangeDiscordCode(code: string) {
  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("DISCORD_CLIENT_ID"),
      client_secret: getRequiredEnv("DISCORD_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: getRequiredEnv("DISCORD_REDIRECT_URI"),
    }),
  });

  if (!response.ok) {
    throw new Error("Discord rejected the authorization code.");
  }

  const token = (await response.json()) as { access_token?: string };

  if (!token.access_token) {
    throw new Error("Discord did not return an access token.");
  }

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error("Unable to read Discord profile.");
  }

  return (await userResponse.json()) as DiscordUser;
}

export async function requireAdminSession() {
  const session = await getDiscordSession();

  if (!session) {
    return Response.json({ error: "Discord login required." }, { status: 401 });
  }

  if (!session.isAdmin) {
    return Response.json({ error: "Discord account is not on the admin whitelist." }, { status: 403 });
  }

  return null;
}

export async function requireAdminSessionWithUser() {
  const session = await getDiscordSession();

  if (!session) {
    return { response: Response.json({ error: "Discord login required." }, { status: 401 }) };
  }

  if (!session.isAdmin) {
    return { response: Response.json({ error: "Discord account is not on the admin whitelist." }, { status: 403 }) };
  }

  return { session };
}

export async function requireAdminRole(allowedRoles: AdminRole[]) {
  const auth = await requireAdminSessionWithUser();
  if ("response" in auth) return auth;

  if (!adminRoleCan(auth.session.adminRole, allowedRoles)) {
    return { response: Response.json({ error: "Admin role is not allowed for this action." }, { status: 403 }) };
  }

  return auth;
}
