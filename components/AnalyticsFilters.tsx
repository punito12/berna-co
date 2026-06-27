"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Filtros de período para el dashboard de analytics. Presets rápidos + rango
// custom. Navega cambiando los searchParams (el server re-renderiza el reporte).
const PRESETS = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "month", label: "Este mes" },
];

export default function AnalyticsFilters({
  preset,
  from,
  to,
}: {
  preset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function go(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    router.push(`/admin/analytics${sp.toString() ? `?${sp}` : ""}`);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => go({ preset: p.key })}
            className={`rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
              preset === p.key && !["custom"].includes(preset)
                ? "bg-black text-white"
                : "border border-line text-ink hover:border-black"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
          />
          <span className="text-muted">a</span>
          <input
            type="date"
            value={t}
            onChange={(e) => setT(e.target.value)}
            className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
          />
          <button
            type="button"
            onClick={() => go({ preset: "custom", from: f, to: t })}
            className="bg-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
