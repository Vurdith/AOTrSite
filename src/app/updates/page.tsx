import Link from "next/link";

import { FloatingHeader } from "@/components/FloatingHeader";
import { PageHero } from "@/components/PageHero";
import { UpdatesList } from "@/components/UpdatesList";
import { getPublicValueItems } from "@/lib/firestoreItems";

const isDevelopment = process.env.NODE_ENV === "development";

export const revalidate = false;

export default async function UpdatesPage() {
  if (!isDevelopment) {
    return <UpdatesUnderConstruction />;
  }

  const items = await getPublicValueItems();

  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
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

function UpdatesUnderConstruction() {
  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <FloatingHeader />
      <PageHero
        kicker="Market updates"
        title="Update ledger is being forged."
        description="This page is getting a cleaner release pass before it goes live. Values and the trade calculator are still available."
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
              The board notes are not public yet.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--fog)/.78)] md:text-base">
              The update log is being tuned behind the scenes. Check back soon for clean patch notes, demand movement, and value-board changes.
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
