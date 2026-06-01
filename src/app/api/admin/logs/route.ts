import { NextResponse } from "next/server";

import { getAdminLogs } from "@/lib/adminLogs";
import { requireAdminSession } from "@/lib/discordAuth";

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const logs = await getAdminLogs();

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin logs.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
