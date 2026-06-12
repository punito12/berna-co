export default function CmsComingSoonCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-white p-6 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted">
        Próxima fase
      </p>
      <h2 className="mt-2 font-black uppercase tracking-tight text-2xl leading-none text-ink">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        {description}
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-line bg-cream/45 px-4 py-3 text-sm font-bold text-ink"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
