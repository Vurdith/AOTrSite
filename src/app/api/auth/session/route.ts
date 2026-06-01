import { NextResponse } from "next/server";

import { getDiscordSession } from "@/lib/discordAuth";

export async function GET() {
  const session = await getDiscordSession();

  return NextResponse.json({ session });
}
