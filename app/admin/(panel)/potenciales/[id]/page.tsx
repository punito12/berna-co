import Link from "next/link";
import { notFound } from "next/navigation";
import ProspectDetailEditor from "@/components/ProspectDetailEditor";
import {
  getProspectConfiguration,
  getProspectDetail,
  PROSPECT_STATUS_LABELS,
} from "@/lib/prospects";

function parseArray(raw: string): unknown[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function dateTime(date: Date): string {
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProspectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let prospect;
  try {
    prospect = await getProspectDetail(params.id);
  } catch {
    notFound();
  }
  const configuration = await getProspectConfiguration();
  const breakdown = parseArray(prospect.scoreBreakdown) as {
    key: string;
    label: string;
    points: number;
  }[];
  const duplicates = [
    ...prospect.duplicateAsFirst.map((candidate) => ({
      candidateId: candidate.id,
      prospect: candidate.second,
      similarity: candidate.similarity,
    })),
    ...prospect.duplicateAsSecond.map((candidate) => ({
      candidateId: candidate.id,
      prospect: candidate.first,
      similarity: candidate.similarity,
    })),
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/admin/potenciales"
        className="text-[10px] font-bold uppercase tracking-widest text-muted underline"
      >
        ← Volver a prospectos
      </Link>
      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {PROSPECT_STATUS_LABELS[prospect.status] ?? prospect.status}
            </p>
            <h2 className="mt-1 font-black uppercase tracking-tight text-3xl text-ink">
              {prospect.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{prospect.address}</p>
            <p className="text-xs text-muted">
              {[prospect.neighborhood, prospect.locality, prospect.province]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="min-w-[150px] border-l-4 border-ink pl-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Oportunidad
            </p>
            <p className="font-black tracking-tight text-4xl text-ink">
              {prospect.score}
              <span className="text-lg text-muted">/100</span>
            </p>
            <p className="text-xs font-bold text-ink">
              {prospect.zone ? `${prospect.zone.name} · Tier ${prospect.zone.tier}` : "Sin zona"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-line px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
            {prospect.categoryKey}
          </span>
          {prospect.ambiguousClassification && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Clasificación ambigua
            </span>
          )}
          {prospect.permanentlyClosed && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-red-800">
              Cerrado permanentemente
            </span>
          )}
          {prospect.linkedCustomer && (
            <Link
              href={`/admin/clientes/${prospect.linkedCustomer.id}`}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800"
            >
              Cliente: {prospect.linkedCustomer.name}
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Por qué obtuvo este score
            </h2>
            <div className="mt-3 space-y-2">
              {breakdown.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 border-b border-line pb-2">
                  <p className="text-sm text-ink">{item.label}</p>
                  <p className="font-black text-ink">+{item.points}</p>
                </div>
              ))}
              {breakdown.length === 0 && (
                <p className="text-sm text-muted">{prospect.scoreExplanation || "Sin desglose."}</p>
              )}
            </div>
            {prospect.manualScore !== null && (
              <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Override manual:</strong> {prospect.manualScore}/100 ·{" "}
                {prospect.manualScoreReason}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Información observable
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Rating</dt><dd className="font-bold text-ink">{prospect.rating ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Reseñas</dt><dd className="font-bold text-ink">{prospect.reviewCount ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Estado Google</dt><dd className="font-bold text-ink">{prospect.operatingStatus ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Confianza clasificación</dt><dd className="font-bold text-ink">{Math.round(prospect.classificationConfidence * 100)}%</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted">Tipos Google</dt><dd className="font-bold text-ink">{parseArray(prospect.rawCategories).join(", ") || "—"}</dd></div>
            </dl>
            {prospect.googleMapsUrl && (
              <a href={prospect.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-[10px] font-bold uppercase tracking-widest text-ink underline">
                Abrir en Google Maps ↗
              </a>
            )}
          </section>

          {duplicates.length > 0 && (
            <section className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              <h2 className="font-black uppercase tracking-tight text-xl text-red-900">
                Posibles duplicados
              </h2>
              <div className="mt-3 space-y-2">
                {duplicates.map((row) => (
                  <Link key={row.candidateId} href="/admin/potenciales/duplicados" className="flex justify-between border-b border-red-200 pb-2 text-sm text-red-900">
                    <span>{row.prospect.name} · {row.prospect.address}</span>
                    <strong>{Math.round(row.similarity * 100)}%</strong>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <ProspectDetailEditor
          prospect={{
            id: prospect.id,
            name: prospect.name,
            address: prospect.address,
            latitude: prospect.latitude,
            longitude: prospect.longitude,
            score: prospect.score,
            status: prospect.status,
            categoryKey: prospect.categoryKey,
            notes: prospect.notes,
            manualCategory: prospect.manualCategory,
            manualScore: prospect.manualScore,
            manualScoreReason: prospect.manualScoreReason,
            linkedCustomerId: prospect.linkedCustomerId,
            zone: prospect.zone,
          }}
          categories={configuration.rules.compatibility.map((rule) => ({
            key: rule.key,
            label: `${rule.label} (${rule.score})`,
          }))}
        />
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-line bg-white p-4">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">Fuentes y descubrimiento</h2>
          <div className="mt-3 space-y-3">
            {prospect.sources.map((source) => (
              <div key={source.id} className="border-b border-line pb-3 text-sm">
                <div className="flex justify-between gap-3">
                  <strong className="text-ink">{source.provider}</strong>
                  <span className="text-xs text-muted">{dateTime(source.lastSeenAt)}</span>
                </div>
                <p className="text-xs text-muted">{source.rawCategory ?? "Sin categoría original"}</p>
                {source.listingUrl && (
                  <a href={source.listingUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-ink underline">
                    Abrir fuente ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-line bg-white p-4">
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">Historial interno</h2>
          <div className="mt-3 space-y-3">
            {prospect.statusHistory.map((event) => (
              <div key={event.id} className="border-b border-line pb-3 text-sm">
                <div className="flex justify-between gap-3">
                  <strong className="text-ink">
                    {event.fromStatus ? `${PROSPECT_STATUS_LABELS[event.fromStatus] ?? event.fromStatus} → ` : ""}
                    {PROSPECT_STATUS_LABELS[event.toStatus] ?? event.toStatus}
                  </strong>
                  <span className="text-xs text-muted">{dateTime(event.createdAt)}</span>
                </div>
                {event.reason && <p className="text-xs text-muted">{event.reason}</p>}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

