import { notFound } from "next/navigation";

import { PageHero } from "@/components/PageHero";
import { TradesBoard } from "@/components/TradesBoard";
import { getDiscordSession } from "@/lib/discordAuth";
import { getPublicValueItems } from "@/lib/supabaseItems";
import { getPublicTradeAds } from "@/lib/tradeAds";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [ads, items, session] = await Promise.all([getPublicTradeAds(), getPublicValueItems(), getDiscordSession()]);

  return (
    <main id="main-content" className="aurora-page grain min-h-screen overflow-hidden">
      <PageHero
        kicker="Trade board"
        title="Player Trade Ads"
        description="Post offers with your Discord identity, search current ads, and filter for the items players are offering or looking for."
      />
      <TradesBoard initialAds={ads} initialItems={items} initialSession={session} />
    </main>
  );
}
