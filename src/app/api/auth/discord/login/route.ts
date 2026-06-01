import { NextResponse } from "next/server";

import { getDiscordLoginUrl, setDiscordOAuthState } from "@/lib/discordAuth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("next") ?? "/";

  try {
    const { state, url } = getDiscordLoginUrl();

    await setDiscordOAuthState(state, returnTo);

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord login is not configured.";
    const setupUrl = new URL(returnTo, request.url);

    setupUrl.searchParams.set("auth", "setup");
    setupUrl.searchParams.set("message", message);

    return NextResponse.redirect(setupUrl);
  }
}
