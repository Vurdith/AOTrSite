import { NextRequest, NextResponse } from "next/server";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const maxStoreEntries = 20_000;

const suspiciousPathPatterns = [
  /\.env(?:\.|\/|$)/i,
  /\.git(?:\/|$)/i,
  /\/(?:wp-admin|wp-login|wordpress|phpmyadmin|pma)(?:\/|$)/i,
  /\/(?:xmlrpc\.php|shell\.php|cmd\.php|vendor\/phpunit)(?:\/|$)/i,
  /(?:^|\/)\.\.(?:\/|$)/,
  /%00/i,
  /%2e%2e/i,
  /%5c/i,
  /\\/,
];

const allowedMethods = new Set(["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE"]);
const deploymentPaused = true;

type RateRule = {
  key: string;
  limit: number;
  windowMs: number;
};

function getClientIp(request: NextRequest) {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
    request.headers.get("x-real-ip"),
  ];
  const value = candidates.map((candidate) => candidate?.trim()).find(Boolean);

  if (!value || value.length > 96 || !/^[a-fA-F0-9:.\-]+$/.test(value)) {
    return "unknown";
  }

  return value;
}

function getRateRule(pathname: string, method: string): RateRule | null {
  if (pathname === "/api/admin/media/upload") {
    return { key: "admin-upload", limit: 8, windowMs: 60_000 };
  }

  if (pathname.startsWith("/api/admin/")) {
    return { key: "admin-api", limit: method === "GET" ? 120 : 45, windowMs: 60_000 };
  }

  if (pathname === "/api/trades") {
    return { key: "trades-api", limit: method === "GET" ? 180 : 20, windowMs: 60_000 };
  }

  if (pathname.startsWith("/api/auth/discord/")) {
    return { key: "discord-auth", limit: 30, windowMs: 60_000 };
  }

  if (pathname === "/api/auth/session") {
    return { key: "session-api", limit: 120, windowMs: 60_000 };
  }

  if (pathname.startsWith("/api/")) {
    return { key: "api", limit: 120, windowMs: 60_000 };
  }

  if (pathname === "/admin" || pathname === "/trades") {
    return { key: "dynamic-page", limit: 180, windowMs: 60_000 };
  }

  return null;
}

function cleanupStore(now: number) {
  if (rateLimitStore.size < maxStoreEntries) return;

  for (const [key, bucket] of rateLimitStore) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  if (rateLimitStore.size < maxStoreEntries) return;

  const overflow = rateLimitStore.size - maxStoreEntries;
  let deleted = 0;

  for (const key of rateLimitStore.keys()) {
    rateLimitStore.delete(key);
    deleted += 1;
    if (deleted > overflow) break;
  }
}

function consumeRateLimit(request: NextRequest, rule: RateRule) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${rule.key}:${ip}`;
  const current = rateLimitStore.get(key);

  cleanupStore(now);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
    return null;
  }

  current.count += 1;

  if (current.count <= rule.limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    {
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(rule.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(current.resetAt / 1000)),
      },
      status: 429,
    },
  );
}

function isSuspiciousPath(pathname: string) {
  let decoded = pathname;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return true;
  }

  return suspiciousPathPatterns.some((pattern) => pattern.test(pathname) || pattern.test(decoded));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (deploymentPaused) {
    if (request.method === "HEAD") {
      return new NextResponse(null, {
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "86400",
          "X-Robots-Tag": "noindex, nofollow",
        },
        status: 503,
      });
    }

    return new NextResponse(
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Deployment Paused</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #08090d;
        color: #f4f7fb;
        font-family: Arial, sans-serif;
      }
      main {
        max-width: 560px;
        padding: 32px;
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
        line-height: 1.15;
      }
      p {
        margin: 0;
        color: #aab3c2;
        font-size: 16px;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Deployment Paused</h1>
      <p>This website is currently unavailable.</p>
    </main>
  </body>
</html>`,
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "86400",
          "X-Robots-Tag": "noindex, nofollow",
        },
        status: 503,
      },
    );
  }

  if (!allowedMethods.has(request.method)) {
    return new NextResponse(null, {
      headers: {
        Allow: Array.from(allowedMethods).join(", "),
        "Cache-Control": "no-store",
      },
      status: 405,
    });
  }

  if (isSuspiciousPath(pathname)) {
    return new NextResponse(null, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 404,
    });
  }

  const rule = getRateRule(pathname, request.method);
  if (rule) {
    const limited = consumeRateLimit(request, rule);
    if (limited) return limited;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
