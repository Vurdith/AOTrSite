import { NextResponse } from "next/server";

import { consumeDiscordOAuthState, createDiscordSession, exchangeDiscordCode, setDiscordSession } from "@/lib/discordAuth";

function authRedirect(request: Request, returnTo: string, auth: string) {
  const redirectUrl = new URL(returnTo, request.url);

  redirectUrl.searchParams.set("auth", auth);

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const { returnTo, state: expectedState } = await consumeDiscordOAuthState();

  if (!code || !state || !expectedState || state !== expectedState) {
    return authRedirect(request, returnTo, "invalid");
  }

  try {
    const user = await exchangeDiscordCode(code);

    await setDiscordSession(createDiscordSession(user));

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch {
    return authRedirect(request, returnTo, "failed");
  }
}
