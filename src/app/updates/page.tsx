import { notFound } from "next/navigation";

import { PageHero } from "@/components/PageHero";
import { UpdatesList } from "@/components/UpdatesList";
import { getPublicValueItems } from "@/lib/supabaseItems";

export const revalidate = false;

export default async function UpdatesPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const items = await getPublicValueItems();

  return (
    <main id="main-content" className="aurora-page grain min-h-screen overflow-hidden">
      <PageHero
        kicker="Market updates"
        title="Value changes and board notes."
        description="Track imports, item-count changes, and demand updates that affect the current AOTR value board."
        action={{ href: "/values", label: "Open values" }}
      />
      <UpdatesList items={items} />
    </main>
  );
}
