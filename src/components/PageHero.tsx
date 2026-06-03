export function PageHero({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="page-hero relative overflow-hidden border-b border-[rgb(var(--gold)/.1)] px-4 pb-12 pt-28 sm:px-6 md:pb-14 md:pt-30 lg:px-8">
      <div className="page-hero-bg" aria-hidden="true" />
      <div className="page-hero-logo" aria-hidden="true" />
      <div className="page-hero-shell mx-auto max-w-7xl">
        <div className="max-w-[820px]">
          <h1 className="font-display gold-text page-hero-title text-4xl leading-none md:text-5xl">{title}</h1>
          <p className="page-hero-copy mt-3 max-w-3xl text-sm leading-6 md:text-base">{description}</p>
        </div>
      </div>
    </section>
  );
}
