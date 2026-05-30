import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";
import { ItemValuePage } from "@/components/ItemValuePage";
import { getValueItem, getValueItems } from "@/lib/firestoreItems";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const items = await getValueItems();

  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getValueItem(id);

  if (!item) {
    return {
      title: "Item Not Found | AOTR Value Terminal",
    };
  }

  return {
    title: `${item.name} Value History | AOTR Value Terminal`,
    description: `View ${item.name} value history, demand, tax, prestige, and source data.`,
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  const item = await getValueItem(id);

  if (!item) notFound();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <ItemValuePage item={item} />
    </main>
  );
}
