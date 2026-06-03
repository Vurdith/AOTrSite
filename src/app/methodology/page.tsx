import { PageHero } from "@/components/PageHero";

const sections = [
  ["Value", "The board stores values in keys, then converts them into vizards and scrolls using the current admin-controlled rates."],
  ["Demand", "Demand is a trade-interest score. Higher demand usually means an item moves faster or justifies a cleaner overpay."],
  ["Trend", "Rising, stable, and falling labels summarize recent movement and admin review, not guaranteed future price direction."],
  ["Updates", "Public pages use a short cache and refresh after admin saves. The values page shows freshness and fallback state."],
  ["Audit", "Admin changes, backup exports, restores, media uploads, seeds, and settings updates are logged with Discord identity."],
];

export default function MethodologyPage() {
  return (
    <main id="main-content" className="aurora-page grain min-h-screen overflow-hidden">
      <PageHero
        kicker="Trust"
        title="How Values Work"
        description="A clear explanation of the numbers, review process, and update behavior behind the AOTR value board."
        action={{ href: "/values", label: "Open values" }}
      />
      <section className="px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-4">
          {sections.map(([title, text]) => (
            <article key={title} className="market-vellum p-4 md:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--fog)/.84)] md:text-base">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
