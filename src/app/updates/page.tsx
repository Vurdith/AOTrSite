import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { UpdatesList } from "@/components/UpdatesList";

export default function UpdatesPage() {
  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Market updates"
        title="Value changes and board notes."
        description="Track imports, item-count changes, and demand updates that affect the current AOTR value board."
        action={{ href: "/values", label: "Open values" }}
      />
      <UpdatesList />
    </main>
  );
}
