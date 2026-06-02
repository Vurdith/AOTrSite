import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";
import { ItemValuePage } from "@/components/ItemValuePage";
import { getPublicValueItems, getPublicValueMarketData, getValueItem } from "@/lib/supabaseItems";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

export const revalidate = false;

export async function generateStaticParams() {
  const items = await getPublicValueItems();

  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const items = await getPublicValueItems();
  const item = items.find((value) => value.id === id) ?? null;

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
  const { currencySettings, items } = await getPublicValueMarketData();
  const item = items.find((value) => value.id === id) ?? (await getValueItem(id));

  if (!item) notFound();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <ItemValuePage item={item} currencySettings={currencySettings} />
    </main>
  );
}
