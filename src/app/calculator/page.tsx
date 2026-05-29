import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { TradeCalculator } from "@/components/TradeCalculator";

export default function CalculatorPage() {
  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Trade calculator"
        title="Calculate Your Trade"
        description="Pick items, compare values, and check demand before you accept."
      />
      <TradeCalculator />
    </main>
  );
}
