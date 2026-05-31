"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAYS = [
  { n: 0, label: "Dom" },
  { n: 1, label: "Lun" },
  { n: 2, label: "Mar" },
  { n: 3, label: "Mié" },
  { n: 4, label: "Jue" },
  { n: 5, label: "Vie" },
  { n: 6, label: "Sáb" },
];

type Zone = {
  id: string;
  name: string;
  postalCodes: string[];
  localities: string[];
  daysOfWeek: number[];
  active: boolean;
};

// Editable card for one zone: name, postal codes, localities, weekdays, active.
export default function ZoneEditor({ zone }: { zone: Zone }) {
  const router = useRouter();
  const [name, setName] = useState(zone.name);
  const [postalCodes, setPostalCodes] = useState<string[]>(zone.postalCodes);
  const [newCode, setNewCode] = useState("");
  const [localities, setLocalities] = useState<string[]>(zone.localities);
  const [newLocality, setNewLocality] = useState("");
  const [days, setDays] = useState<number[]>(zone.daysOfWeek);
  const [active, setActive] = useState(zone.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function addCode() {
    const m = newCode.trim().match(/\d{4}/);
    if (!m) {
      setError("El código postal debe tener 4 dígitos (ej: 1642).");
      return;
    }
    const code = m[0];
    if (!postalCodes.includes(code)) setPostalCodes((p) => [...p, code]);
    setNewCode("");
    setError(null);
    setStatus("idle");
  }
  function removeCode(code: string) {
    setPostalCodes((p) => p.filter((c) => c !== code));
    setStatus("idle");
  }

  function addLocality() {
    const value = newLocality.trim();
    if (!value) return;
    if (localities.some((l) => l.toLowerCase() === value.toLowerCase())) {
      setNewLocality("");
      return;
    }
    setLocalities((prev) => [...prev, value]);
    setNewLocality("");
    setStatus("idle");
  }

  function removeLocality(value: string) {
    setLocalities((prev) => prev.filter((l) => l !== value));
    setStatus("idle");
  }

  function toggleDay(n: number) {
    setDays((prev) =>
      prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]
    );
    setStatus("idle");
  }

  async function save() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/admin/zones/${zone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          postalCodes,
          localities,
          daysOfWeek: days,
          active,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "No se pudo guardar.");
      }
      setStatus("saved");
      setError(null);
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

      {/* Postal codes — the coverage barrier */}
      <div className="mt-5">
        <p className="mb-1 font-bold uppercase tracking-wide text-[11px] text-muted">
          Códigos postales
        </p>
        <p className="mb-2 text-xs text-muted">
          4 dígitos (ej: 1642). Definen a qué CP entregamos en esta zona.
        </p>
        <div className="flex flex-wrap gap-2">
          {postalCodes.length === 0 && (
            <span className="text-sm text-muted">Sin códigos todavía.</span>
          )}
          {postalCodes.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-2 rounded-full border border-black bg-white px-3 py-1 text-sm font-bold text-ink"
            >
              {c}
              <button
                type="button"
                onClick={() => removeCode(c)}
                aria-label={`Quitar ${c}`}
                className="font-bold text-muted hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCode();
              }
            }}
            className="flex-1 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
            placeholder="Ej: 1642"
          />
          <button
            type="button"
            onClick={addCode}
            className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Localities (reference / labels) */}
      <div className="mt-5">
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Localidades
        </p>
        <div className="flex flex-wrap gap-2">
          {localities.length === 0 && (
            <span className="text-sm text-muted">
              Sin localidades todavía.
            </span>
          )}
          {localities.map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1 text-sm text-ink"
            >
              {l}
              <button
                type="button"
                onClick={() => removeLocality(l)}
                aria-label={`Quitar ${l}`}
                className="font-bold text-muted hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newLocality}
            onChange={(e) => setNewLocality(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLocality();
              }
            }}
            className="flex-1 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
            placeholder="Ej: Beccar"
          />
          <button
            type="button"
            onClick={addLocality}
            className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
          >
            Agregar
          </button>
        </div>
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
