import { NextResponse } from "next/server";

import { getAdminLogs } from "@/lib/adminLogs";
import { requireAdminRole } from "@/lib/discordAuth";

export async function GET() {
  const auth = await requireAdminRole(["owner", "editor", "auditor"]);
  if ("response" in auth) return auth.response;

  try {
    const logs = await getAdminLogs();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Unable to load admin logs.", error);

    return NextResponse.json({ error: "Unable to load admin logs." }, { status: 500 });
  }
}
