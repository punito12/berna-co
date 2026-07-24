"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROSPECT_STATUSES } from "@/lib/prospect-types";

const ProspectDiscoveryMap = dynamic(
  () => import("@/components/ProspectDiscoveryMap"),
  { ssr: false }
);

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  PENDING_REVIEW: "Pendiente de revisión",
  INTERESTING: "Interesante",
  HIGH_PRIORITY: "Alta prioridad",
  VISITED: "Visitado",
  EXISTING_CLIENT: "Cliente existente",
  DISCARDED: "Descartado / irrelevante",
  DUPLICATE: "Duplicado",
  CLOSED: "Cerrado",
};

const inputClass =
  "rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

export default function ProspectDetailEditor({
  prospect,
  categories,
}: {
  prospect: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    score: number;
    status: string;
    categoryKey: string;
    notes: string;
    manualCategory: string | null;
    manualScore: number | null;
    manualScoreReason: string | null;
    linkedCustomerId: string | null;
    zone: { id: string; name: string; tier: string; polygon: string } | null;
  };
  categories: { key: string; label: string }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(prospect.status);
  const [notes, setNotes] = useState(prospect.notes);
  const [manualCategory, setManualCategory] = useState(
    prospect.manualCategory ?? ""
  );
  const [manualScore, setManualScore] = useState(
    prospect.manualScore === null ? "" : String(prospect.manualScore)
  );
  const [reason, setReason] = useState(prospect.manualScoreReason ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, method: "PATCH" | "POST", body?: unknown) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo completar.");
      setMessage("Cambios guardados.");
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    request(`/api/admin/prospects/${prospect.id}`, "PATCH", {
      status,
      notes,
      manualCategory: manualCategory || null,
      manualScore: manualScore === "" ? null : Number(manualScore),
      manualScoreReason: reason || null,
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="font-black uppercase tracking-tight text-xl text-ink">
          Revisión interna
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Estado
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`${inputClass} w-full`}
            >
              {PROSPECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Categoría manual
            </span>
            <select
              value={manualCategory}
              onChange={(event) => setManualCategory(event.target.value)}
              className={`${inputClass} w-full`}
            >
              <option value="">Usar reglas automáticas</option>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Score manual (0–100)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={manualScore}
              onChange={(event) => setManualScore(event.target.value)}
              placeholder="Vacío = calculado"
              className={`${inputClass} w-full`}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Motivo del score manual
            </span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Obligatorio si reemplazás el score"
              className={`${inputClass} w-full`}
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
            Notas internas
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            className={`${inputClass} w-full`}
          />
        </label>
        {(message || error) && (
          <p className={`mt-3 text-sm font-bold ${error ? "text-red-700" : "text-emerald-800"}`}>
            {error ?? message}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              request(`/api/admin/prospects/${prospect.id}/recalculate`, "POST")
            }
            disabled={busy}
            className="border border-line px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:border-black disabled:opacity-40"
          >
            Recalcular score
          </button>
          {!prospect.linkedCustomerId && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Se creará o vinculará un cliente mayorista usando solo el nombre del local. ¿Continuar?"
                  )
                ) {
                  request(`/api/admin/prospects/${prospect.id}/convert`, "POST");
                }
              }}
              disabled={busy}
              className="border border-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-ink disabled:opacity-40"
            >
              Convertir en cliente
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-black px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
          >
            {busy ? "Guardando…" : "Guardar revisión"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 font-black uppercase tracking-tight text-xl text-ink">
          Ubicación
        </h2>
        <ProspectDiscoveryMap
          prospects={[
            {
              id: prospect.id,
              name: prospect.name,
              address: prospect.address,
              latitude: prospect.latitude,
              longitude: prospect.longitude,
              score: prospect.score,
              status: prospect.status,
              categoryKey: prospect.categoryKey,
            },
          ]}
          zones={
            prospect.zone
              ? [
                  {
                    id: prospect.zone.id,
                    name: prospect.zone.name,
                    tier: prospect.zone.tier,
                    polygon: prospect.zone.polygon,
                  },
                ]
              : []
          }
          coverage={[]}
          selectedId={prospect.id}
        />
      </section>
    </div>
  );
}

