import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";
import { ItemValuePage } from "@/components/ItemValuePage";
import { valueItems } from "@/content/items";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return valueItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = valueItems.find((value) => value.id === id);

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
  const item = valueItems.find((value) => value.id === id);

  if (!item) notFound();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <ItemValuePage item={item} />
    </main>
  );
}
