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
    console.error("Unable to load admin logs.", error);

    return NextResponse.json({ error: "Unable to load admin logs." }, { status: 500 });
  }
}
