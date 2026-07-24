"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DuplicateRow = {
  id: string;
  similarity: number;
  reasons: string;
  first: {
    id: string;
    name: string;
    address: string;
    locality: string | null;
    score: number;
    categoryKey: string;
    reviewCount: number | null;
    googlePlaceId: string | null;
    sources: { provider: string }[];
    zone: { name: string; tier: string } | null;
  };
  second: DuplicateRow["first"];
};

function parseReasons(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: DuplicateRow["first"];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left transition-colors ${
        selected ? "border-black bg-cream/60" : "border-line bg-white hover:border-black"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black uppercase tracking-tight text-lg text-ink">
            {candidate.name}
          </p>
          <p className="text-sm text-muted">{candidate.address}</p>
          <p className="text-xs text-muted">
            {candidate.locality ?? "Sin localidad"} ·{" "}
            {candidate.zone ? `${candidate.zone.name} / Tier ${candidate.zone.tier}` : "Sin zona"}
          </p>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 font-black text-ink">
          {candidate.score}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-muted">
        <span>{candidate.categoryKey}</span>
        <span>· {candidate.reviewCount ?? 0} reseñas</span>
        <span>· {[...new Set(candidate.sources.map((source) => source.provider))].join(", ")}</span>
        {candidate.googlePlaceId && <span>· Place ID</span>}
      </div>
      <p className="mt-3 text-xs font-bold text-ink">
        {selected ? "Se conservará como principal" : "Elegir como principal"}
      </p>
    </button>
  );
}

export default function ProspectDuplicateReview({
  rows,
}: {
  rows: DuplicateRow[];
}) {
  const router = useRouter();
  const [primaryByPair, setPrimaryByPair] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(
    id: string,
    action: "MERGE" | "DISMISS",
    primaryId?: string
  ) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/prospects/duplicates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, primaryId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo revisar.");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-muted">
          No hay duplicados pendientes
        </p>
        <p className="mt-1 text-sm text-muted">
          Las coincidencias exactas ya se unifican por Place ID o dirección.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {rows.map((row) => {
        const primaryId = primaryByPair[row.id] ?? row.first.id;
        return (
          <article key={row.id} className="rounded-xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Coincidencia por proximidad y nombre
                </p>
                <h2 className="font-black uppercase tracking-tight text-xl text-ink">
                  {Math.round(row.similarity * 100)}% de similitud
                </h2>
                <p className="text-xs text-muted">{parseReasons(row.reasons).join(" · ")}</p>
              </div>
              <Link href={`/admin/potenciales/${row.first.id}`} className="text-[10px] font-bold uppercase tracking-widest text-muted underline">
                Ver ficha
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <CandidateCard
                candidate={row.first}
                selected={primaryId === row.first.id}
                onSelect={() =>
                  setPrimaryByPair((current) => ({ ...current, [row.id]: row.first.id }))
                }
              />
              <CandidateCard
                candidate={row.second}
                selected={primaryId === row.second.id}
                onSelect={() =>
                  setPrimaryByPair((current) => ({ ...current, [row.id]: row.second.id }))
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => review(row.id, "DISMISS")}
                disabled={busy === row.id}
                className="border border-line px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:border-black hover:text-ink disabled:opacity-40"
              >
                No son el mismo local
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Las fuentes se moverán al prospecto principal. El otro registro quedará marcado como duplicado. ¿Continuar?")) {
                    review(row.id, "MERGE", primaryId);
                  }
                }}
                disabled={busy === row.id}
                className="bg-black px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
              >
                Fusionar y conservar principal
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

