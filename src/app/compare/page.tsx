import { ItemCompare } from "@/components/ItemCompare";
import { PageHero } from "@/components/PageHero";
import { getPublicValueMarketData } from "@/lib/supabaseItems";

export const revalidate = false;

export default async function ComparePage() {
  const { currencySettings, items } = await getPublicValueMarketData();

  return (
    <main id="main-content" className="aurora-page grain min-h-screen overflow-hidden">
      <PageHero
        kicker="Item compare"
        title="Compare Trade Targets"
        description="Put multiple items side by side before choosing what to offer, request, or avoid."
        action={{ href: "/calculator", label: "Open calculator" }}
      />
      <ItemCompare currencySettings={currencySettings} items={items} />
    </main>
  );
}
