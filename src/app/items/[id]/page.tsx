import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";
import { ItemValuePage } from "@/components/ItemValuePage";
import { PageHero } from "@/components/PageHero";
import { getValueItem, getValueItems } from "@/lib/firestoreItems";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

const isDevelopment = process.env.NODE_ENV === "development";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  if (!isDevelopment) return [];

  const items = await getValueItems();

  return items.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  if (!isDevelopment) {
    return {
      title: "Item Pages Hidden | AOTR Value Terminal",
      description: "Item value graph pages are currently hidden while they are being refined.",
    };
  }

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
  if (!isDevelopment) {
    return <ItemPagesHidden />;
  }

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

function ItemPagesHidden() {
  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Trade graphs"
        title="Item pages are being refined."
        description="Individual item graph pages are temporarily hidden while the trade history experience is being polished. Values and the trade calculator are still available."
        action={{ href: "/values", label: "Open values" }}
      />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="detail-slate text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full border border-[rgb(var(--gold)/.32)] bg-[rgb(var(--gold)/.1)] shadow-[0_0_30px_rgb(var(--gold)/.14)]">
              <span className="size-5 rotate-45 border border-[rgb(var(--bright-gold)/.72)] bg-[rgb(var(--bright-gold)/.18)]" aria-hidden="true" />
            </div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-[rgb(var(--bright-gold))]">Under construction</p>
            <h2 className="font-display gold-text mx-auto mt-3 max-w-2xl text-3xl leading-none md:text-5xl">
              The graph pages are not public yet.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--fog)/.78)] md:text-base">
              The item pages are being kept private until the graph and history experience is ready for release.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/values" className="royal-button cut-corners inline-flex h-12 items-center px-5 text-sm font-bold uppercase tracking-[0.14em] text-white">
                <span>Open values</span>
              </Link>
              <Link href="/calculator" className="inline-flex h-12 items-center border border-[rgb(var(--gold)/.18)] bg-black/20 px-5 text-sm font-bold uppercase tracking-[0.14em] text-[rgb(var(--bright-gold))] transition hover:border-[rgb(var(--bright-gold)/.46)] hover:bg-[rgb(var(--gold)/.1)] hover:text-white">
                <span>Trade calculator</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
