import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { ValuesList } from "@/components/ValuesList";
import { getPublicValueCurrencySettings, getPublicValueItems } from "@/lib/supabaseItems";

export const revalidate = false;

export default async function ValuesPage() {
  const [items, currencySettings] = await Promise.all([getPublicValueItems(), getPublicValueCurrencySettings()]);

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
