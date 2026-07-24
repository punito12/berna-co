"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import GooglePlacesCostBreakdown from "@/components/GooglePlacesCostBreakdown";
import type { GooglePlacesSkuEstimate } from "@/lib/google-places-pricing";
import { PROSPECT_STATUSES } from "@/lib/prospect-types";

const ProspectDiscoveryMap = dynamic(
  () => import("@/components/ProspectDiscoveryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-lg border border-line bg-white text-sm text-muted">
        Cargando mapa territorial…
      </div>
    ),
  }
);

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  PENDING_REVIEW: "Pendiente",
  INTERESTING: "Interesante",
  HIGH_PRIORITY: "Alta prioridad",
  VISITED: "Visitado",
  EXISTING_CLIENT: "Cliente existente",
  DISCARDED: "Descartado",
  DUPLICATE: "Duplicado",
  CLOSED: "Cerrado",
};

type ProspectRow = {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  locality: string | null;
  province: string | null;
  latitude: number;
  longitude: number;
  categoryKey: string;
  score: number;
  scoreExplanation: string;
  reviewCount: number | null;
  rating: number | null;
  operatingStatus: string | null;
  status: string;
  lastVerifiedAt: Date | string;
  firstDiscoveredAt: Date | string;
  ambiguousClassification: boolean;
  linkedCustomerId: string | null;
  zone: { id: string; name: string; tier: string; polygon: string } | null;
  sources: { provider: string; listingUrl: string | null }[];
  _count: { duplicateAsFirst: number; duplicateAsSecond: number };
};

type MapRow = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  score: number;
  status: string;
  categoryKey: string;
};

type EnrichmentPreview = {
  selectedCount: number;
  uniqueGooglePlaces: number;
  skippedWithoutGooglePlaceId: number;
  missingProspects: number;
  maxBatchSize: number;
  pricing: GooglePlacesSkuEstimate;
};

const inputClass =
  "rounded border border-line bg-white px-2 py-2 text-sm text-ink outline-none focus:border-black";

function shortDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function scoreClass(score: number): string {
  if (score >= 80) return "bg-red-50 text-red-800 border-red-200";
  if (score >= 60) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
}

function pageHref(searchParams: URLSearchParams, page: number): string {
  const params = new URLSearchParams(searchParams);
  params.set("page", String(page));
  return `/admin/potenciales?${params.toString()}`;
}

export default function ProspectWorkspace({
  rows,
  mapRows,
  total,
  page,
  pageCount,
  options,
  zones,
  coverage,
}: {
  rows: ProspectRow[];
  mapRows: MapRow[];
  total: number;
  page: number;
  pageCount: number;
  options: {
    provinces: string[];
    localities: string[];
    neighborhoods: string[];
    categories: string[];
  };
  zones: { id: string; name: string; tier: string; polygon: string }[];
  coverage: {
    scanId: string;
    pointIndex: number;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    status: string;
  }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("PENDING_REVIEW");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enrichmentPreview, setEnrichmentPreview] =
    useState<EnrichmentPreview | null>(null);
  const exportHref = useMemo(
    () =>
      `/api/admin/prospects/export${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`,
    [searchParams]
  );

  async function updateBulkStatus() {
    if (selectedRows.length === 0) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/prospects/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRows, status: bulkStatus }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setSelectedRows([]);
      setEnrichmentPreview(null);
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleRow(id: string) {
    setEnrichmentPreview(null);
    setSelectedRows((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function previewEnrichment() {
    if (selectedRows.length === 0) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/prospects/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRows, preview: true }),
      });
      const body = (await response.json()) as {
        error?: string;
        preview?: EnrichmentPreview;
      };
      if (!response.ok || !body.preview) {
        throw new Error(body.error ?? "No se pudo estimar el enrichment.");
      }
      setEnrichmentPreview(body.preview);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmEnrichment() {
    if (!enrichmentPreview) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/prospects/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRows, confirmed: true }),
      });
      const body = (await response.json()) as {
        error?: string;
        enriched?: { id: string }[];
        failures?: { id: string; message: string }[];
      };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo enriquecer.");
      }
      const enriched = body.enriched?.length ?? 0;
      const failures = body.failures?.length ?? 0;
      setMessage(
        failures
          ? `${enriched} prospectos enriquecidos; ${failures} fallaron.`
          : `${enriched} prospectos enriquecidos con rating y cantidad de reseñas.`
      );
      setSelectedRows([]);
      setEnrichmentPreview(null);
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        action="/admin/potenciales"
        className="rounded-xl border border-line bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Buscar
            </span>
            <input
              name="search"
              defaultValue={searchParams.get("search") ?? ""}
              placeholder="Nombre, dirección o localidad"
              className={`${inputClass} w-full`}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Score mínimo
            </span>
            <input
              type="number"
              name="minScore"
              min={0}
              max={100}
              defaultValue={searchParams.get("minScore") ?? ""}
              className={`${inputClass} w-full`}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Tier
            </span>
            <select
              name="tier"
              defaultValue={searchParams.get("tier") ?? ""}
              className={`${inputClass} w-full`}
            >
              <option value="">Todos</option>
              <option value="A">Tier A</option>
              <option value="B">Tier B</option>
              <option value="C">Tier C</option>
              <option value="EXCLUDED">Excluido</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Estado interno
            </span>
            <select
              name="status"
              defaultValue={searchParams.get("status") ?? ""}
              className={`${inputClass} w-full`}
            >
              <option value="">Todos</option>
              {PROSPECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Provincia
            </span>
            <select
              name="province"
              defaultValue={searchParams.get("province") ?? ""}
              className={`${inputClass} w-full`}
            >
              <option value="">Todas</option>
              {options.provinces.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Localidad
            </span>
            <select
              name="locality"
              defaultValue={searchParams.get("locality") ?? ""}
              className={`${inputClass} w-full`}
            >
              <option value="">Todas</option>
              {options.localities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Categoría
            </span>
            <select
              name="category"
              defaultValue={searchParams.get("category") ?? ""}
              className={`${inputClass} w-full`}
            >
              <option value="">Todas</option>
              {options.categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Fuente
            </span>
            <select
              name="source"
              defaultValue={searchParams.get("source") ?? ""}
              className={`${inputClass} w-full`}
            >
              <option value="">Todas</option>
              <option value="GOOGLE">Google Places</option>
              <option value="GREEN_LIFE">Green Life</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Orden
            </span>
            <select
              name="sort"
              defaultValue={searchParams.get("sort") ?? "score"}
              className={`${inputClass} w-full`}
            >
              <option value="score">Mayor score</option>
              <option value="score-asc">Menor score</option>
              <option value="recent">Más recientes</option>
              <option value="reviews">Más reseñas</option>
              <option value="name">Nombre</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {[
            ["onlyNew", "Solo nuevos"],
            ["ambiguous", "Clasificación ambigua"],
            ["possibleDuplicates", "Posibles duplicados"],
            ["excludeExistingClients", "Excluir clientes"],
            ["excludeReviewed", "Sin revisar"],
            ["includeExcluded", "Mostrar excluidos"],
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked={searchParams.get(name) === "1"}
                className="accent-black"
              />
              {label}
            </label>
          ))}
          <div className="ml-auto flex gap-2">
            <Link
              href="/admin/potenciales"
              className="border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted hover:border-black hover:text-ink"
            >
              Limpiar
            </Link>
            <button
              type="submit"
              className="bg-black px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </form>

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Mapa de oportunidad
            </h2>
            <p className="text-xs text-muted">
              {Math.min(mapRows.length, 500)} de {total} prospectos según los filtros actuales.
            </p>
          </div>
        </div>
        <ProspectDiscoveryMap
          prospects={mapRows}
          zones={zones}
          coverage={coverage}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-black uppercase tracking-tight text-xl text-ink">
              Prospectos
            </h2>
            <p className="text-xs text-muted">{total} resultados</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedRows.length > 0 && (
              <>
                <span className="text-xs font-bold text-ink">
                  {selectedRows.length} seleccionados
                </span>
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className={inputClass}
                >
                  {PROSPECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={updateBulkStatus}
                  disabled={saving}
                  className="bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
                >
                  {saving ? "Guardando…" : "Cambiar estado"}
                </button>
                <button
                  type="button"
                  onClick={previewEnrichment}
                  disabled={saving}
                  className="border border-amber-400 bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-950 disabled:opacity-40"
                >
                  Estimar enrichment
                </button>
              </>
            )}
            <a
              href={exportHref}
              className="border border-line px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:border-black"
            >
              Exportar CSV
            </a>
          </div>
        </div>
        {enrichmentPreview && (
          <div className="border-b border-amber-300 bg-amber-50/40 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-950">
                  Etapa 2 · Enrichment manual
                </p>
                <p className="mt-1 text-sm text-amber-950">
                  {enrichmentPreview.uniqueGooglePlaces} lugares únicos con
                  Google Place ID ·{" "}
                  {enrichmentPreview.skippedWithoutGooglePlaceId} sin ID se
                  omitirán.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEnrichmentPreview(null)}
                  disabled={saving}
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmEnrichment}
                  disabled={
                    saving ||
                    enrichmentPreview.uniqueGooglePlaces === 0 ||
                    enrichmentPreview.uniqueGooglePlaces >
                      enrichmentPreview.maxBatchSize
                  }
                  className="bg-amber-950 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
                >
                  Confirmar enrichment
                </button>
              </div>
            </div>
            {enrichmentPreview.uniqueGooglePlaces >
              enrichmentPreview.maxBatchSize && (
              <p className="mt-2 text-xs font-bold text-red-800">
                Seleccioná como máximo {enrichmentPreview.maxBatchSize} lugares
                únicos por ejecución.
              </p>
            )}
            <GooglePlacesCostBreakdown
              estimates={[enrichmentPreview.pricing]}
              maxCostBeforeFreeUsd={
                enrichmentPreview.pricing.maxCostBeforeFreeUsd
              }
              estimatedCostAfterFreeUsd={
                enrichmentPreview.pricing.estimatedCostAfterFreeUsd
              }
            />
          </div>
        )}
        {error && (
          <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {message && (
          <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
            {message}
          </p>
        )}
        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="font-black uppercase tracking-wide text-muted">
              No hay prospectos con estos filtros
            </p>
            <p className="mt-1 text-sm text-muted">
              Ajustá los filtros o iniciá un scan desde Zonas y scans.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-cream/60 text-[10px] font-bold uppercase tracking-widest text-muted">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar página"
                      checked={selectedRows.length === rows.length && rows.length > 0}
                      onChange={(event) => {
                        setEnrichmentPreview(null);
                        setSelectedRows(
                          event.target.checked ? rows.map((row) => row.id) : []
                        );
                      }}
                      className="accent-black"
                    />
                  </th>
                  <th className="px-3 py-3">Local</th>
                  <th className="px-3 py-3">Ubicación</th>
                  <th className="px-3 py-3">Tier</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Motivo principal</th>
                  <th className="px-3 py-3">Reseñas</th>
                  <th className="px-3 py-3">Fuente</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Verificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const duplicateCount =
                    row._count.duplicateAsFirst + row._count.duplicateAsSecond;
                  return (
                    <tr
                      key={row.id}
                      onMouseEnter={() => setSelectedId(row.id)}
                      className={`transition-colors ${
                        selectedId === row.id ? "bg-cream/70" : "hover:bg-cream/30"
                      }`}
                    >
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${row.name}`}
                          checked={selectedRows.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="accent-black"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <Link
                          href={`/admin/potenciales/${row.id}`}
                          className="font-bold text-ink underline-offset-2 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.ambiguousClassification && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                              Ambiguo
                            </span>
                          )}
                          {duplicateCount > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase text-red-800">
                              {duplicateCount} duplicado posible
                            </span>
                          )}
                          {row.linkedCustomerId && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-800">
                              Cliente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[230px] px-3 py-3 align-top">
                        <p className="text-ink">{row.address}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {[row.neighborhood, row.locality, row.province]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top font-black text-ink">
                        {row.zone?.tier ?? "—"}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-ink">
                        {row.categoryKey}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 font-black ${scoreClass(row.score)}`}
                        >
                          {row.score}
                        </span>
                      </td>
                      <td className="max-w-[250px] px-3 py-3 align-top text-xs text-muted">
                        {row.scoreExplanation.split(" · ")[0] || "Sin explicación"}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-ink">
                        {row.reviewCount ?? "—"}
                        {row.rating !== null ? ` · ${row.rating.toFixed(1)}★` : ""}
                      </td>
                      <td className="px-3 py-3 align-top text-[10px] font-bold uppercase tracking-wide text-muted">
                        {[...new Set(row.sources.map((source) => source.provider))].join(", ")}
                      </td>
                      <td className="px-3 py-3 align-top text-xs font-bold text-ink">
                        {STATUS_LABELS[row.status] ?? row.status}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-muted">
                        {shortDate(row.lastVerifiedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <p className="text-xs text-muted">
            Página {page} de {pageCount}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(searchParams, page - 1)}
                className="border border-line px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink hover:border-black"
              >
                Anterior
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={pageHref(searchParams, page + 1)}
                className="border border-line px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink hover:border-black"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
