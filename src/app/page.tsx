import Image from "next/image";

import { FloatingHeader } from "@/components/FloatingHeader";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { LoadingScene } from "@/components/LoadingScene";
import { updateLog, valueItems } from "@/content/items";
import { rarityStyles } from "@/lib/rarityStyles";

const features = [
  {
    href: "/values",
    title: "Values",
    text: "Current item value, demand, tax, trend, and prestige in one scan-friendly board.",
  },
  {
    href: "/calculator",
    title: "Calculator",
    text: "Build both sides of a trade and check the value gap before you accept.",
  },
  ...(process.env.NODE_ENV === "development"
    ? [
        {
          href: "/updates",
          title: "Updates",
          text: "See board imports, item-count changes, and demand updates in one log.",
        },
      ]
    : []),
];

export default function Home() {
  const topItems = [...valueItems].sort((a, b) => b.demand - a.demand).slice(0, 3);

  return (
    <main className="grain min-h-screen overflow-hidden">
      <LoadingScene />
      <FloatingHeader />

      <section className="home-hero relative min-h-[100dvh] overflow-hidden border-b border-[rgb(var(--gold)/.14)]">
        <HeroBackdrop />
        <div className="home-hero-cuts" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <Image
          src="/aotevo-logo.png"
          alt=""
          width={1000}
          height={520}
          priority
          className="home-hero-watermark"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-10 px-4 pb-10 pt-28 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.95fr)] lg:px-8">
          <div className="home-hero-copyblock reveal-up max-w-3xl">
            <h1 className="home-hero-title font-display max-w-4xl text-5xl leading-[0.95] tracking-normal md:text-7xl lg:text-8xl">
              Value Central
            </h1>
            <div className="home-hero-divider" aria-hidden="true" />
            <p className="home-hero-copy max-w-2xl text-xl leading-8 md:text-2xl">
              AOTR cosmetic values, demand, gem tax, prestige gates, and trade balance before you send the offer.
            </p>
            <div className="home-hero-actions flex flex-wrap items-center gap-3">
              <a
                href="/values"
                className="hero-button hero-button-primary group"
              >
                <span>Open values</span>
                <span className="transition group-hover:translate-x-1">-&gt;</span>
              </a>
              <a
                href="/calculator"
                className="hero-button hero-button-secondary"
              >
                Test a trade
              </a>
            </div>
          </div>

          <div className="home-hero-logo-stage reveal-up hidden lg:grid">
            <span className="home-hero-chain home-hero-chain-top" aria-hidden="true" />
            <span className="home-hero-chain home-hero-chain-bottom" aria-hidden="true" />
            <Image
              src="/aotevo-logo.png"
              alt="Attack on Titan Revolution"
              width={760}
              height={390}
              priority
              className="home-hero-logo"
            />
          </div>
        </div>
      </section>

      <section className="section-band px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-7 lg:grid-cols-[360px_1fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">Workspace</p>
              <h2 className="font-display mt-3 text-3xl md:text-5xl">Pick the tool you need.</h2>
            </div>
            <p className="max-w-3xl text-lg leading-7 text-zinc-400">
              Each page has one job: scan values, test a trade, or read the latest board changes.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <a
              href={features[0].href}
              className="relic-frame group grid min-h-72 content-between overflow-hidden p-6 transition hover:-translate-y-1"
            >
              <div className="grid gap-6 md:grid-cols-[120px_1fr] md:items-start">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--bright-gold))]">Primary tool</div>
                <div>
                  <h3 className="font-display text-4xl">{features[0].title}</h3>
                  <p className="mt-4 max-w-xl text-lg leading-7 text-zinc-400">{features[0].text}</p>
                </div>
              </div>
              <span className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-[rgb(var(--bright-gold))] transition group-hover:translate-x-1 group-hover:text-white">
                Open board
              </span>
            </a>
            <div className="grid gap-4">
              {features.slice(1).map((feature) => (
              <a
                key={feature.href}
                href={feature.href}
                className="sigil-card group grid min-h-36 content-between p-5 transition hover:-translate-y-1"
              >
                <div className="grid gap-4">
                  <div>
                  <h3 className="font-display text-2xl">{feature.title}</h3>
                  <p className="mt-3 leading-6 text-zinc-400">{feature.text}</p>
                  </div>
                </div>
                <span className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-[rgb(var(--bright-gold))] transition group-hover:translate-x-1 group-hover:text-white">
                  Open section
                </span>
              </a>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-band px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[rgb(var(--bright-gold))]">Preview</p>
            <h2 className="font-display mt-3 text-3xl md:text-5xl">Recent value movement</h2>
            <p className="mt-4 max-w-2xl text-lg leading-7 text-zinc-400">Dates, item names, and the reason behind the move.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
            <div className="relic-frame p-5 md:p-6">
            <div className="flex items-center gap-3 text-[rgb(var(--bright-gold))]">
              <span className="size-2 rotate-45 bg-[rgb(var(--bright-gold))]" />
              <p className="text-xs font-bold uppercase tracking-[0.22em]">Update log</p>
            </div>
            <div className="mt-7 space-y-5">
              {updateLog.map((entry) => (
                <div key={`${entry.date}-${entry.item}`} className="grid gap-4 border-l border-[rgb(var(--gold)/.26)] pl-4 sm:grid-cols-[86px_1fr_auto] sm:items-start">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[rgb(var(--fog))]">{entry.date}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="mt-1 size-2 shrink-0 rotate-45 bg-[rgb(var(--bright-gold))]" />
                      <h3 className="font-display text-xl">{entry.item}</h3>
                    </div>
                    <p className="mt-2 leading-6 text-zinc-400">{entry.reason}</p>
                  </div>
                  <strong className="w-fit border border-[rgb(var(--gold)/.18)] bg-black/30 px-3 py-1 text-lg text-[rgb(var(--bright-gold))]">
                    {entry.change}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {topItems.map((item) => (
              <article key={item.id} className="royal-surface group grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-2xl">{item.name}</h3>
                    <span className={`rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.14em] ${rarityStyles[item.rarity].badge}`}>
                      {rarityStyles[item.rarity].label}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-zinc-400">{item.value.toLocaleString()} keys / P{item.prestige}</p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Demand</div>
                  <div className="font-display gold-text text-4xl">{item.demand}</div>
                </div>
              </article>
            ))}
          </div>
          </div>
          {process.env.NODE_ENV === "development" ? (
            <a href="/updates" className="royal-button mt-8 inline-flex h-12 items-center px-5 text-sm font-bold uppercase tracking-[0.14em] text-white">
              <span>Open full updates page</span>
            </a>
          ) : null}
        </div>
      </section>

      <footer className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-[rgb(var(--gold)/.16)] pt-6 text-sm text-[rgb(var(--fog))] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rotate-45 bg-[rgb(var(--gold))]" />
            <span>AOTR Value Central.</span>
          </div>
          <span>No official affiliation. Values are editable sample data.</span>
        </div>
      </footer>
    </main>
  );
}
