import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { ValuesList } from "@/components/ValuesList";
import { getPublicValueMarketData } from "@/lib/supabaseItems";

export const revalidate = false;

export default async function ValuesPage() {
  const { currencySettings, items } = await getPublicValueMarketData();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Value board"
        title="AoT:R Item Values"
        description="Check current item values, demand, tax, prestige requirements, and trend before you trade."
      />
      <ValuesList items={items} currencySettings={currencySettings} />
    </main>
  );
}
