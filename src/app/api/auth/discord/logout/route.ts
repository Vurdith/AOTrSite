import { NextResponse } from "next/server";

import { clearDiscordSession } from "@/lib/discordAuth";
import { rejectCrossOriginMutation } from "@/lib/security";

function getSafeReturnPath(request: Request) {
  const referer = request.headers.get("referer");

  if (!referer) return "/";

  try {
    const refererUrl = new URL(referer);
    const requestUrl = new URL(request.url);

    if (refererUrl.origin !== requestUrl.origin) {
      return "/";
    }

    return `${refererUrl.pathname}${refererUrl.search}`;
  } catch {
    return "/";
  }
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginMutation(request);
  if (forbidden) return forbidden;

  await clearDiscordSession();

  return NextResponse.redirect(new URL(getSafeReturnPath(request), request.url), { status: 303 });
}
