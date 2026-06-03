import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const databaseTimeoutMs = 1500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await withTimeout(prisma.$queryRaw`select 1`, databaseTimeoutMs);

    return NextResponse.json(
      {
        checks: {
          app: "ok",
          database: "ok",
        },
        ok: true,
        timestamp,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Health check failed.", error);

    return NextResponse.json(
      {
        checks: {
          app: "ok",
          database: "error",
        },
        ok: false,
        timestamp,
      },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }
}
