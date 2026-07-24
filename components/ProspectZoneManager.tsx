"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import GooglePlacesCostBreakdown from "@/components/GooglePlacesCostBreakdown";
import type { GoogleDiscoveryCostEstimate } from "@/lib/google-places-pricing";
import type { GeoPolygon } from "@/lib/zones";

const ZonePolygonMap = dynamic(() => import("@/components/ZonePolygonMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg border border-line bg-cream text-sm text-muted">
      Cargando editor de polígono…
    </div>
  ),
});

const ProspectDiscoveryMap = dynamic(
  () => import("@/components/ProspectDiscoveryMap"),
  { ssr: false }
);

type Query = {
  id: string;
  label: string;
  provider: string;
  mode: string;
  value: string;
  categoryFamily: string;
};

type Zone = {
  id: string;
  name: string;
  kind: string;
  tier: string;
  polygon: string;
  active: boolean;
  scanEnabled: boolean;
  gridSpacingMeters: number;
  searchRadiusMeters: number;
  defaultRequestLimit: number;
  notes: string;
  queries: { queryId: string }[];
  _count: { prospects: number; scans: number };
};

type Scan = {
  id: string;
  zoneId: string;
  status: string;
  requestLimit: number;
  requestCount: number;
  detailRequestCount: number;
  successfulRequests: number;
  failedRequests: number;
  newProspects: number;
  updatedProspects: number;
  duplicatesDetected: number;
  estimatedRequests: number;
  estimatedDetailRequests: number;
  estimatedCostUsdCents: number;
  estimatedMaxCostUsdCents: number;
  createdAt: Date | string;
  zone: { name: string };
  _count: { cells: number };
};

type Preview = {
  pointCount: number;
  queryCount: number;
  estimatedRequests: number;
  effectiveRequests: number;
  requestLimit: number;
  resultLimitPerRequest: number;
  estimatedCostUsdCents: number;
  estimatedMaxCostUsdCents: number;
  pricing: GoogleDiscoveryCostEstimate;
  points: { latitude: number; longitude: number }[];
};

const inputClass =
  "rounded border border-line bg-white px-2 py-2 text-sm text-ink outline-none focus:border-black";

function parsePolygon(raw: string): GeoPolygon | null {
  try {
    const value = JSON.parse(raw) as GeoPolygon;
    return value?.type === "Polygon" ? value : null;
  } catch {
    return null;
  }
}

function scanStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "En cola",
    RUNNING: "En curso",
    PAUSED: "Pausado",
    COMPLETED: "Completo",
    PARTIAL_FAILED: "Con fallas",
    LIMIT_REACHED: "Límite alcanzado",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? status;
}

function ZoneCard({
  zone,
  queries,
}: {
  zone: Zone | null;
  queries: Query[];
}) {
  const router = useRouter();
  const [name, setName] = useState(zone?.name ?? "");
  const [kind, setKind] = useState(zone?.kind ?? "CUSTOM");
  const [tier, setTier] = useState(zone?.tier ?? "C");
  const [polygon, setPolygon] = useState<GeoPolygon | null>(
    zone ? parsePolygon(zone.polygon) : null
  );
  const [spacing, setSpacing] = useState(zone?.gridSpacingMeters ?? 700);
  const [radius, setRadius] = useState(zone?.searchRadiusMeters ?? 500);
  const [requestLimit, setRequestLimit] = useState(
    zone?.defaultRequestLimit ?? 250
  );
  const [resultLimit, setResultLimit] = useState(20);
  const [active, setActive] = useState(zone?.active ?? true);
  const [scanEnabled, setScanEnabled] = useState(zone?.scanEnabled ?? false);
  const [notes, setNotes] = useState(zone?.notes ?? "");
  const [queryIds, setQueryIds] = useState(
    zone?.queries.map((row) => row.queryId) ?? queries.map((query) => query.id)
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupedQueries = useMemo(() => {
    const groups = new Map<string, Query[]>();
    for (const query of queries) {
      const rows = groups.get(query.categoryFamily) ?? [];
      rows.push(query);
      groups.set(query.categoryFamily, rows);
    }
    return [...groups.entries()];
  }, [queries]);

  function body() {
    return {
      name,
      kind,
      tier,
      polygon,
      gridSpacingMeters: Number(spacing),
      searchRadiusMeters: Number(radius),
      defaultRequestLimit: Number(requestLimit),
      active,
      scanEnabled,
      notes,
      queryIds,
    };
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        zone
          ? `/api/admin/prospects/zones/${zone.id}`
          : "/api/admin/prospects/zones",
        {
          method: zone ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body()),
        }
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
      setMessage("Zona guardada.");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function previewScan() {
    if (!zone) {
      setError("Guardá la zona antes de estimar un scan.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/prospects/scans/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneId: zone.id,
          queryIds,
          requestLimit,
          resultLimitPerRequest: resultLimit,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        preview?: Preview;
      };
      if (!response.ok || !result.preview) {
        throw new Error(result.error ?? "No se pudo calcular la estimación.");
      }
      setPreview(result.preview);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function startScan() {
    if (!zone || !preview) {
      setError("Calculá la estimación antes de iniciar.");
      return;
    }
    const confirmed = window.confirm(
      `Este scan hará hasta ${preview.effectiveRequests} búsquedas IDs-only y hasta ${preview.pricing.maximumUniquePlaces} Place Details Pro después de deduplicar. Máximo antes del free tier: US$ ${preview.pricing.maxCostBeforeFreeUsd.toFixed(2)}. Estimado con el uso mensual configurado: US$ ${preview.pricing.estimatedCostAfterFreeUsd.toFixed(2)}. ¿Iniciar?`
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/prospects/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneId: zone.id,
          queryIds,
          requestLimit,
          resultLimitPerRequest: resultLimit,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo iniciar.");
      setMessage("Scan encolado. El worker procesará lotes resumibles.");
      setPreview(null);
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            {zone ? `${zone._count.prospects} prospectos · ${zone._count.scans} scans` : "Nueva área"}
          </p>
          <h2 className="mt-1 font-black uppercase tracking-tight text-xl text-ink">
            {zone?.name ?? "Definir zona comercial"}
          </h2>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="accent-black"
            />
            Activa
          </label>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={scanEnabled}
              onChange={(event) => setScanEnabled(event.target.checked)}
              className="accent-black"
            />
            Habilitar scans
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Nombre
          </span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} w-full`} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Tipo de área
          </span>
          <select value={kind} onChange={(event) => setKind(event.target.value)} className={`${inputClass} w-full`}>
            <option value="NEIGHBORHOOD">Barrio</option>
            <option value="LOCALITY">Localidad</option>
            <option value="GATED_COMMUNITY">Barrio cerrado</option>
            <option value="COMMERCIAL_CENTER">Centro comercial</option>
            <option value="CUSTOM">Área personalizada</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Encaje comercial
          </span>
          <select value={tier} onChange={(event) => setTier(event.target.value)} className={`${inputClass} w-full`}>
            <option value="A">Tier A</option>
            <option value="B">Tier B</option>
            <option value="C">Tier C</option>
            <option value="EXCLUDED">Excluida</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Separación de grilla (m)
          </span>
          <input type="number" min={100} max={5000} value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} className={`${inputClass} w-full`} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Radio por punto (m)
          </span>
          <input type="number" min={100} max={50000} value={radius} onChange={(event) => setRadius(Number(event.target.value))} className={`${inputClass} w-full`} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Límite por scan
          </span>
          <input type="number" min={1} max={10000} value={requestLimit} onChange={(event) => setRequestLimit(Number(event.target.value))} className={`${inputClass} w-full`} />
        </label>
        <label className="flex items-end">
          <span className="w-full">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Máximo de IDs por búsqueda
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={resultLimit}
              onChange={(event) => setResultLimit(Number(event.target.value))}
              className={`${inputClass} w-full`}
            />
          </span>
        </label>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">
          Polígono
        </p>
        <p className="mb-2 text-xs text-muted">
          Dibujá un solo polígono preciso. Solo se crean centros de búsqueda dentro del área.
        </p>
        <ZonePolygonMap initial={polygon} onChange={setPolygon} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
          Familias de búsqueda
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {groupedQueries.map(([family, familyQueries]) => (
            <div key={family} className="rounded border border-line p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ink">
                {family}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {familyQueries.map((query) => (
                  <label key={query.id} className="flex items-start gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={queryIds.includes(query.id)}
                      onChange={() =>
                        setQueryIds((current) =>
                          current.includes(query.id)
                            ? current.filter((id) => id !== query.id)
                            : [...current, query.id]
                        )
                      }
                      className="mt-0.5 accent-black"
                    />
                    <span>
                      <span className="font-bold text-ink">{query.label}</span>
                      <span className="block">
                        Text Search IDs-only · {query.value}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
          Notas internas
        </span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className={`${inputClass} w-full`} />
      </label>

      {preview && (
        <div className="mt-4 rounded-lg border border-black bg-cream/40 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div><p className="text-[9px] font-bold uppercase text-muted">Puntos</p><p className="font-black text-xl">{preview.pointCount}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-muted">Consultas</p><p className="font-black text-xl">{preview.queryCount}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-muted">Requests teóricos</p><p className="font-black text-xl">{preview.estimatedRequests}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-muted">Requests con tope</p><p className="font-black text-xl">{preview.effectiveRequests}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-muted">Details máximos</p><p className="font-black text-xl">{preview.pricing.maximumUniquePlaces}</p></div>
            <div><p className="text-[9px] font-bold uppercase text-muted">Costo tras free tier</p><p className="font-black text-xl">US$ {preview.pricing.estimatedCostAfterFreeUsd.toFixed(2)}</p></div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Los Place Details se solicitan solo para IDs únicos que todavía no
            existen en la base. El máximo supone que todos los IDs devueltos son
            distintos; el costo real puede ser menor después de deduplicar.
          </p>
          <GooglePlacesCostBreakdown
            estimates={preview.pricing.skuEstimates}
            maxCostBeforeFreeUsd={preview.pricing.maxCostBeforeFreeUsd}
            estimatedCostAfterFreeUsd={preview.pricing.estimatedCostAfterFreeUsd}
          />
          {polygon && (
            <div className="mt-4">
              <ProspectDiscoveryMap
                prospects={[]}
                zones={[
                  {
                    id: zone?.id ?? "preview",
                    name: name || "Vista previa",
                    tier,
                    polygon: JSON.stringify(polygon),
                  },
                ]}
                coverage={[]}
                previewPoints={preview.points}
              />
            </div>
          )}
        </div>
      )}

      {(message || error) && (
        <p className={`mt-3 text-sm font-bold ${error ? "text-red-700" : "text-emerald-800"}`}>
          {error ?? message}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={save} disabled={saving} className="border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black disabled:opacity-40">
          {saving ? "Guardando…" : zone ? "Guardar zona" : "Crear zona"}
        </button>
        {zone && (
          <>
            <button type="button" onClick={previewScan} disabled={saving} className="border border-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-ink disabled:opacity-40">
              Estimar scan
            </button>
            <button type="button" onClick={startScan} disabled={saving || !preview || !scanEnabled} className="bg-black px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-30">
              Iniciar scan
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function ScanHistory({
  scans,
  cellGroups,
}: {
  scans: Scan[];
  cellGroups: { scanId: string; status: string; _count: { _all: number } }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function action(scanId: string, actionName: string) {
    setBusy(scanId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/prospects/scans/${scanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar.");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-black uppercase tracking-tight text-xl text-ink">Historial de scans</h2>
        <p className="text-xs text-muted">Cada scan conserva sus celdas, progreso, límites y fallas.</p>
      </div>
      {error && <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}
      {scans.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted">Todavía no hay scans.</p>
      ) : (
        <div className="divide-y divide-line">
          {scans.map((scan) => {
            const completed = cellGroups.find((row) => row.scanId === scan.id && row.status === "COMPLETED")?._count._all ?? 0;
            const failed = cellGroups.find((row) => row.scanId === scan.id && row.status === "FAILED")?._count._all ?? 0;
            const percent = scan._count.cells ? Math.round(((completed + failed) / scan._count.cells) * 100) : 0;
            return (
              <article key={scan.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{scan.zone.name}</p>
                    <p className="text-xs text-muted">
                      {new Date(scan.createdAt).toLocaleString("es-AR")} · {scanStatusLabel(scan.status)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-ink">{percent}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>{completed}/{scan._count.cells} celdas completas</span>
                  <span>{failed} fallidas</span>
                  <span>{scan.requestCount}/{scan.requestLimit} búsquedas</span>
                  <span>{scan.detailRequestCount} Place Details</span>
                  <span>{scan.newProspects} nuevos</span>
                  <span>{scan.updatedProspects} actualizados</span>
                  <span>{scan.duplicatesDetected} duplicados posibles</span>
                  <span>máximo US$ {(scan.estimatedMaxCostUsdCents / 100).toFixed(2)}</span>
                  <span>tras free tier US$ {(scan.estimatedCostUsdCents / 100).toFixed(2)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["PENDING", "RUNNING"].includes(scan.status) && (
                    <button type="button" onClick={() => action(scan.id, "PAUSE")} disabled={busy === scan.id} className="border border-line px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink">Pausar</button>
                  )}
                  {scan.status === "PAUSED" && (
                    <button type="button" onClick={() => action(scan.id, "RESUME")} disabled={busy === scan.id} className="bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white">Reanudar</button>
                  )}
                  {["PARTIAL_FAILED", "LIMIT_REACHED"].includes(scan.status) && failed > 0 && (
                    <button type="button" onClick={() => action(scan.id, "RETRY_FAILED")} disabled={busy === scan.id} className="border border-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink">Reintentar fallas</button>
                  )}
                  {!["COMPLETED", "CANCELLED"].includes(scan.status) && (
                    <button type="button" onClick={() => action(scan.id, "CANCEL")} disabled={busy === scan.id} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">Cancelar</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ProspectZoneManager({
  zones,
  queries,
  scans,
  cellGroups,
}: {
  zones: Zone[];
  queries: Query[];
  scans: Scan[];
  cellGroups: { scanId: string; status: string; _count: { _all: number } }[];
}) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
        <div>
          <h2 className="font-black uppercase tracking-tight text-xl text-ink">Zonas comerciales</h2>
          <p className="text-sm text-muted">Los tiers describen encaje comercial; no son una valoración social del área.</p>
        </div>
        <button type="button" onClick={() => setCreating((value) => !value)} className="bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white">
          {creating ? "Cerrar nueva zona" : "Crear zona"}
        </button>
      </div>
      {creating && <ZoneCard zone={null} queries={queries} />}
      {zones.map((zone) => (
        <ZoneCard key={zone.id} zone={zone} queries={queries} />
      ))}
      <ScanHistory scans={scans} cellGroups={cellGroups} />
    </div>
  );
}
