import { NextResponse } from "next/server";

import { clearDiscordSession } from "@/lib/discordAuth";

function getSafeReturnPath(request: Request) {
  const referer = request.headers.get("referer");

  if (!referer) return "/";

  const refererUrl = new URL(referer);
  const requestUrl = new URL(request.url);

  if (refererUrl.origin !== requestUrl.origin) {
    return "/";
  }

  return `${refererUrl.pathname}${refererUrl.search}`;
}

export async function POST(request: Request) {
  await clearDiscordSession();

  return NextResponse.redirect(new URL(getSafeReturnPath(request), request.url), { status: 303 });
}
