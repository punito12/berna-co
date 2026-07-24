import Link from "next/link";
import ProspectWorkspace from "@/components/ProspectWorkspace";
import {
  getProspectDashboard,
  getProspectFilterOptions,
  getProspectMapCoverage,
  listProspects,
  PROSPECT_STATUS_LABELS,
  type ProspectFilters,
} from "@/lib/prospects";

export const dynamic = "force-dynamic";

function numberValue(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanValue(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function filtersFrom(searchParams?: Record<string, string | undefined>): ProspectFilters {
  return {
    search: searchParams?.search,
    minScore: numberValue(searchParams?.minScore),
    maxScore: numberValue(searchParams?.maxScore),
    province: searchParams?.province,
    locality: searchParams?.locality,
    neighborhood: searchParams?.neighborhood,
    tier: searchParams?.tier,
    category: searchParams?.category,
    source: searchParams?.source,
    minReviews: numberValue(searchParams?.minReviews),
    operatingStatus: searchParams?.operatingStatus,
    status: searchParams?.status,
    onlyNew: booleanValue(searchParams?.onlyNew),
    ambiguous: booleanValue(searchParams?.ambiguous),
    possibleDuplicates: booleanValue(searchParams?.possibleDuplicates),
    excludeExistingClients: booleanValue(searchParams?.excludeExistingClients),
    excludeReviewed: booleanValue(searchParams?.excludeReviewed),
    includeExcluded: booleanValue(searchParams?.includeExcluded),
    sort: searchParams?.sort,
    page: numberValue(searchParams?.page),
  };
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PotentialPointsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const filters = filtersFrom(searchParams);
  const [dashboard, list, options, coverage] = await Promise.all([
    getProspectDashboard(),
    listProspects(filters),
    getProspectFilterOptions(),
    getProspectMapCoverage(),
  ]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border border-line bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Prospectos activos
          </p>
          <p className="mt-2 font-black tracking-tight text-3xl text-ink">
            {dashboard.total}
          </p>
          <p className="mt-1 text-xs text-muted">
            {dashboard.newCount} descubiertos en 7 días
          </p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Alta oportunidad
          </p>
          <p className="mt-2 font-black tracking-tight text-3xl text-ink">
            {dashboard.highPriority}
          </p>
          <p className="mt-1 text-xs text-muted">Score ≥ 80 o prioridad manual</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            Zonas recorridas
          </p>
          <p className="mt-2 font-black tracking-tight text-3xl text-ink">
            {dashboard.zonesScanned}
          </p>
          <p className="mt-1 text-xs text-muted">
            {dashboard.lastScan
              ? `Último lote: ${dateLabel(dashboard.lastScan.updatedAt)}`
              : "Todavía no se ejecutaron scans"}
          </p>
        </article>
        <Link
          href="/admin/potenciales/duplicados"
          className="rounded-lg border border-line bg-ink p-4 text-white transition-colors hover:bg-black"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-cream/70">
            Revisión pendiente
          </p>
          <p className="mt-2 font-black tracking-tight text-3xl">
            {dashboard.duplicateCount}
          </p>
          <p className="mt-1 text-xs text-cream/80">posibles duplicados</p>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <article className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-ink">
            Por tier comercial
          </h2>
          <div className="mt-3 space-y-2">
            {["A", "B", "C", "EXCLUDED"].map((tier) => {
              const count =
                dashboard.byTier.find((row) => row.tier === tier)?.count ?? 0;
              return (
                <div key={tier} className="flex items-center justify-between border-b border-line pb-2 text-sm">
                  <span className="font-bold text-ink">Tier {tier}</span>
                  <span className="text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </article>
        <article className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-ink">
            Por estado interno
          </h2>
          <div className="mt-3 space-y-2">
            {dashboard.byStatus.slice(0, 6).map((row) => (
              <div key={row.status} className="flex items-center justify-between border-b border-line pb-2 text-sm">
                <span className="font-bold text-ink">
                  {PROSPECT_STATUS_LABELS[row.status] ?? row.status}
                </span>
                <span className="text-muted">{row._count._all}</span>
              </div>
            ))}
            {dashboard.byStatus.length === 0 && (
              <p className="text-sm text-muted">Sin datos todavía.</p>
            )}
          </div>
        </article>
        <article className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-ink">
              Descubrimientos recientes
            </h2>
            <Link
              href="/admin/potenciales/zonas"
              className="text-[10px] font-bold uppercase tracking-widest text-muted underline"
            >
              Iniciar scan
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {dashboard.recent.map((prospect) => (
              <Link
                key={prospect.id}
                href={`/admin/potenciales/${prospect.id}`}
                className="flex items-center justify-between gap-3 border-b border-line pb-2 text-sm"
              >
                <span>
                  <span className="block font-bold text-ink">{prospect.name}</span>
                  <span className="text-xs text-muted">
                    {prospect.locality ?? "Sin localidad"}
                  </span>
                </span>
                <span className="font-black text-ink">{prospect.score}</span>
              </Link>
            ))}
            {dashboard.recent.length === 0 && (
              <p className="py-3 text-sm text-muted">
                Creá una zona, revisá el costo estimado e iniciá el primer scan.
              </p>
            )}
          </div>
        </article>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Territorio y revisión
            </h2>
            <p className="text-sm text-muted">
              Los filtros afectan la tabla, el mapa y la exportación.
            </p>
          </div>
          <p className="max-w-md text-right text-xs text-muted">
            La cobertura es práctica, no exhaustiva: Google puede ordenar o
            limitar resultados aunque las celdas se superpongan.
          </p>
        </div>
        <ProspectWorkspace
          {...list}
          options={options}
          zones={options.zones}
          coverage={coverage}
        />
      </section>
    </div>
  );
}

