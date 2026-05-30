import { AdminPanel } from "@/components/AdminPanel";
import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { getValueItems } from "@/lib/firestoreItems";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const items = await getValueItems();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Admin panel"
        title="Manage Value Data"
        description="Edit every item field, seed Firestore, and prepare records for future icon uploads."
      />
      <AdminPanel initialItems={items} />
    </main>
  );
}
