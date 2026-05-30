import { AdminPanel } from "@/components/AdminPanel";
import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { getValueCurrencySettings, getValueItems } from "@/lib/firestoreItems";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [items, currencySettings] = await Promise.all([getValueItems(), getValueCurrencySettings()]);

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Admin panel"
        title="Manage Value Data"
        description="Edit every item field, seed Firestore, and prepare records for future icon uploads."
      />
      <AdminPanel initialItems={items} initialCurrencySettings={currencySettings} />
    </main>
  );
}
