// Placeholder for admin sections that are planned but not built yet (Fase 1
// only wires up navigation). Keeps the route alive so the menu never 404s.
export default function AdminPlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        {title}
      </h1>
      <div className="mt-6 rounded-xl border-2 border-dashed border-line bg-white p-8 text-center">
        <p className="mx-auto max-w-md text-sm text-muted">{description}</p>
        {phase && (
          <span className="mt-4 inline-block rounded-full bg-cream px-3 py-1 font-bold uppercase tracking-widest text-[10px] text-muted">
            {phase}
          </span>
        )}
      </div>
    </div>
  );
}
