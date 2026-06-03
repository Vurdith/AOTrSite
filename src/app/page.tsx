import Image from "next/image";

import { HeroBackdrop } from "@/components/HeroBackdrop";
import { LoadingScene } from "@/components/LoadingScene";

const features = [
  {
    href: "/values",
    title: "Values",
    text: "Current item value, demand, tax, trend, and prestige in one place.",
    action: "Open values",
  },
  {
    href: "/calculator",
    title: "Calculator",
    text: "Build both sides of a trade and check the value gap before you accept.",
    action: "Calculate trade",
  },
  {
    href: "/updates",
    title: "Updates",
    text: "See board imports, item-count changes, and demand updates in one log.",
    action: "Open updates",
  },
];

export default function Home() {
  return (
    <main id="main-content" className="grain min-h-screen overflow-hidden">
      <LoadingScene />

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
              Find item values, demand, tax, and prestige requirements. Calculate value and demand of your trade before you make it.
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
                Calculate a trade
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

      <section className="section-band tools-section px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="tools-section-head">
            <div>
              <h2 className="font-display">Trading Tools</h2>
            </div>
          </div>
          <div className="tools-grid">
            {features.map((feature, index) => (
              <a
                key={feature.href}
                href={feature.href}
                className={`tool-card group ${index === 0 ? "tool-card-primary" : ""}`}
              >
                <div>
                  <div>
                    <h3 className="font-display">{feature.title}</h3>
                    <p>{feature.text}</p>
                  </div>
                </div>
                <div className="tool-card-footer">
                  <strong>{feature.action}</strong>
                </div>
              </a>
            ))}
          </div>
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
