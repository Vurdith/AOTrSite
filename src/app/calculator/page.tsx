import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { TradeCalculator } from "@/components/TradeCalculator";
import { getValueCurrencySettings, getValueItems } from "@/lib/firestoreItems";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const [items, currencySettings] = await Promise.all([getValueItems(), getValueCurrencySettings()]);

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Trade calculator"
        title="Calculate Your Trade"
        description="Pick items, compare values, and check demand before you accept."
      />
      <TradeCalculator items={items} currencySettings={currencySettings} />
    </main>
  );
}
