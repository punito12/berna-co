"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Filtros del comparador de Inteligencia Comercial: período A (base) vs período
// B (actual), con presets rápidos. Navega por searchParams; el server calcula.
const PRESETS = [
  { key: "month", label: "Este mes vs mes anterior" },
  { key: "mtd", label: "Mes actual vs mismo tramo anterior" },
  { key: "7d", label: "7 días vs 7 anteriores" },
  { key: "30d", label: "30 días vs 30 anteriores" },
];

const inputClass =
  "rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black";

export default function ICFilters({
  preset,
  fromA,
  toA,
  fromB,
  toB,
}: {
  preset: string;
  fromA: string;
  toA: string;
  fromB: string;
  toB: string;
}) {
  const router = useRouter();
  const [fa, setFa] = useState(fromA);
  const [ta, setTa] = useState(toA);
  const [fb, setFb] = useState(fromB);
  const [tb, setTb] = useState(toB);

  function go(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    router.push(`/admin/operaciones/inteligencia-comercial${sp.toString() ? `?${sp}` : ""}`);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => go({ preset: p.key })}
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
              preset === p.key
                ? "bg-black text-white"
                : "border border-line text-ink hover:border-black"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Período A (base)
          </span>
          <div className="flex items-center gap-2">
            <input type="date" value={fa} onChange={(e) => setFa(e.target.value)} className={inputClass} />
            <span className="text-muted">a</span>
            <input type="date" value={ta} onChange={(e) => setTa(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Período B (actual)
          </span>
          <div className="flex items-center gap-2">
            <input type="date" value={fb} onChange={(e) => setFb(e.target.value)} className={inputClass} />
            <span className="text-muted">a</span>
            <input type="date" value={tb} onChange={(e) => setTb(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => go({ preset: "custom", fromA: fa, toA: ta, fromB: fb, toB: tb })}
          className="bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
        >
          Comparar
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="border border-line px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
          title="Vista limpia para mostrar o guardar como PDF"
        >
          Modo presentación
        </button>
      </div>
    </div>
  );
}
