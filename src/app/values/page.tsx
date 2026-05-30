import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { ValuesList } from "@/components/ValuesList";
import { getValueItems } from "@/lib/firestoreItems";

export const dynamic = "force-dynamic";

export default async function ValuesPage() {
  const items = await getValueItems();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Value board"
        title="AoT:R Item Values"
        description="Check current item values, demand, tax, prestige requirements, and trend before you trade."
      />
      <ValuesList items={items} />
    </main>
  );
}
