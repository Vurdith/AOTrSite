import { NextResponse } from "next/server";

import { getDiscordLoginUrl, sanitizeReturnTo, setDiscordOAuthState } from "@/lib/discordAuth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = sanitizeReturnTo(requestUrl.searchParams.get("next"));

  try {
    const { state, url } = getDiscordLoginUrl();

    await setDiscordOAuthState(state, returnTo);

    return NextResponse.redirect(url);
  } catch (error) {
    const setupUrl = new URL(returnTo, request.url);

    setupUrl.searchParams.set("auth", "setup");
    setupUrl.searchParams.set("message", "Discord login is not configured.");
    console.error("Discord login setup failed.", error);

    return NextResponse.redirect(setupUrl);
  }
}
