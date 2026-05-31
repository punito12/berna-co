"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { GeoPolygon } from "@/lib/zones";

// Leaflet touches `window`, so load the map only on the client.
const ZonePolygonMap = dynamic(() => import("@/components/ZonePolygonMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full items-center justify-center rounded-lg border border-line bg-cream text-sm text-muted">
      Cargando mapa…
    </div>
  ),
});

const WEEKDAYS = [
  { n: 1, label: "Lun" },
  { n: 2, label: "Mar" },
  { n: 3, label: "Mié" },
  { n: 4, label: "Jue" },
  { n: 5, label: "Vie" },
  { n: 6, label: "Sáb" },
  { n: 0, label: "Dom" },
];

type Zone = {
  id: string;
  name: string;
  polygon: GeoPolygon | null;
  daysOfWeek: number[];
  active: boolean;
};

// Editable card for one zone: name, a drawing map for the coverage polygon,
// weekday toggles and active flag.
export default function ZoneEditor({ zone }: { zone: Zone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [polygon, setPolygon] = useState<GeoPolygon | null>(zone.polygon);
  const [days, setDays] = useState<number[]>(zone.daysOfWeek);
  const [active, setActive] = useState(zone.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function toggleDay(n: number) {
    setDays((prev) =>
      prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]
    );
    setStatus("idle");
  }

  async function save() {
    if (!polygon) {
      setError("Dibujá el área de cobertura en el mapa antes de guardar.");
      setStatus("error");
      return;
    }
    setSaving(true);
    setStatus("idle");
    setError(null);
    try {
      const res = await fetch(`/api/admin/zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, polygon, daysOfWeek: days, active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "No se pudo guardar.");
      }
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar la zona "${zone.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/zones/${zone.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus("error");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setStatus("idle");
          }}
          className="flex-1 min-w-[180px] rounded border border-line bg-white px-3 py-2 font-bold uppercase tracking-tight text-ink outline-none focus:border-black"
          placeholder="Nombre de la zona"
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              setStatus("idle");
            }}
            className="h-4 w-4 accent-black"
          />
          <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
            Activa
          </span>
        </label>
      </div>

      {/* Coverage polygon map */}
      <div className="mt-5">
        <p className="mb-1 font-bold uppercase tracking-wide text-[11px] text-muted">
          Área de cobertura
        </p>
        <p className="mb-2 text-xs text-muted">
          Usá la herramienta de polígono (arriba a la derecha del mapa) para
          dibujar el área. Tocá un vértice para editar, o el tacho para borrar.
          {polygon ? " — Área definida ✓" : " — Sin área todavía"}
        </p>
        <ZonePolygonMap
          initial={zone.polygon}
          onChange={(p) => {
            setPolygon(p);
            setStatus("idle");
          }}
        />
      </div>

      {/* Weekdays */}
      <div className="mt-5">
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Días de entrega
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.n);
            return (
              <button
                key={d.n}
                type="button"
                onClick={() => toggleDay(d.n)}
                aria-pressed={on}
                className={`rounded-full border px-4 py-1.5 font-bold uppercase tracking-wide text-xs transition-colors ${
                  on
                    ? "border-black bg-black text-white"
                    : "border-line bg-white text-ink hover:border-black"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={saving}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
        >
          Eliminar zona
        </button>
        <div className="flex items-center gap-3">
          {status === "saved" && (
            <span className="text-xs font-bold text-ink">Guardado ✓</span>
          )}
          {status === "error" && (
            <span className="text-xs font-bold text-ink">Error ✕</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
          >
            {saving ? "…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-right text-sm font-bold text-ink">{error}</p>
      )}
    </div>
  );
}
