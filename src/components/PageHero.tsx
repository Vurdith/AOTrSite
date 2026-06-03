import Link from "next/link";

export function PageHero({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className="page-hero relative overflow-hidden border-b border-[rgb(var(--gold)/.1)] px-4 pb-8 pt-28 sm:px-6 md:pt-30 lg:px-8">
      <div className="page-hero-bg" aria-hidden="true" />
      <div className="page-hero-logo" aria-hidden="true" />
      <div className="page-hero-shell mx-auto max-w-7xl">
        <div className="page-hero-kicker">
          <span>{kicker}</span>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,760px)_auto] lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display gold-text page-hero-title text-4xl leading-none md:text-5xl">{title}</h1>
            <p className="page-hero-copy mt-3 max-w-3xl text-sm leading-6 md:text-base">{description}</p>
          </div>
          {action ? (
            <Link href={action.href} className="royal-button cut-corners page-hero-action inline-flex h-12 w-fit items-center px-5 text-sm font-bold uppercase tracking-[0.14em] text-white">
              <span>{action.label}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
