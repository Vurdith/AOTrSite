import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { ValuesList } from "@/components/ValuesList";

export default function ValuesPage() {
  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Value board"
        title="AoT:R Item Values"
        description="Check current cosmetic values, demand, gem tax, prestige gates, and trend before you trade."
      />
      <ValuesList />
    </main>
  );
}
