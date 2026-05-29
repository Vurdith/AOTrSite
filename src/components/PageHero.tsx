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
    <section className="relative overflow-hidden border-b border-[rgb(var(--gold)/.1)] px-4 pb-7 pt-28 sm:px-6 md:pt-30 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(620px_220px_at_72%_0%,rgb(var(--gold)/.12),transparent_62%),radial-gradient(440px_180px_at_8%_65%,rgb(var(--ruby)/.1),transparent_70%),linear-gradient(180deg,#130803,#090503)]" />
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--bright-gold))]">{kicker}</p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,760px)_auto] lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display gold-text text-3xl leading-none md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">{description}</p>
          </div>
          {action ? (
            <Link href={action.href} className="royal-button cut-corners inline-flex h-12 w-fit items-center px-5 text-sm font-bold uppercase tracking-[0.14em] text-white">
              <span>{action.label}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
