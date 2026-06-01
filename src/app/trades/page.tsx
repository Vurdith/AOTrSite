import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { TradesBoard } from "@/components/TradesBoard";
import { getDiscordSession } from "@/lib/discordAuth";
import { getPublicValueItems } from "@/lib/firestoreItems";
import { getPublicTradeAds } from "@/lib/tradeAds";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const [ads, items, session] = await Promise.all([getPublicTradeAds(), getPublicValueItems(), getDiscordSession()]);

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Trade board"
        title="Player Trade Ads"
        description="Post offers with your Discord identity, search current ads, and filter for the items players are offering or looking for."
      />
      <TradesBoard initialAds={ads} initialItems={items} initialSession={session} />
    </main>
  );
}
