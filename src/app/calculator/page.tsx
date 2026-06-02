import { MarketFreshnessWatcher } from "@/components/MarketFreshnessWatcher";
import { PageHero } from "@/components/PageHero";
import { TradeCalculator } from "@/components/TradeCalculator";
import { getPublicValueMarketData } from "@/lib/supabaseItems";

export const revalidate = false;

export default async function CalculatorPage() {
  const { currencySettings, items } = await getPublicValueMarketData();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <MarketFreshnessWatcher />
      <PageHero
        kicker="Trade calculator"
        title="Calculate Your Trade"
        description="Pick items, compare values, and check demand before you accept."
      />
      <TradeCalculator items={items} currencySettings={currencySettings} />
    </main>
  );
}
