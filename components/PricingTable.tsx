"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingRow } from "@/lib/pricing";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// Margin cell color: red if negative, yellow if low (<20%), else plain.
function marginClass(pct: number): string {
  if (pct < 0) return "bg-red-50 text-red-700";
  if (pct < 20) return "bg-amber-50 text-amber-800";
  return "text-ink";
}

export default function PricingTable({ rows }: { rows: PricingRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function applySuggested() {
    if (!confirm("¿Copiar el precio sugerido al precio público en toda la tabla?"))
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pricing/apply-suggested", {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(d.error || "No se pudo aplicar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function exportExcel() {
    const head = [
      "Producto",
      "Empanado",
      "Costo/kg",
      "Sugerido",
      "Público",
      "Mayorista",
      "Kiosco",
      "Margen minorista $",
      "Margen minorista %",
      "Margen mayorista $",
      "Margen mayorista %",
      "Margen kiosco $",
      "Margen kiosco %",
    ];
    const lines = rows.map((r) =>
      [
        r.productName,
        r.breadcrumbLabel,
        r.cost,
        r.suggestedPrice,
        r.publicPrice,
        r.mayoristaPrice,
        r.kioscoPrice,
        r.marginMinorista.pesos,
        r.marginMinorista.pct.toFixed(1),
        r.marginMayorista.pesos,
        r.marginMayorista.pct.toFixed(1),
        r.marginKiosco.pesos,
        r.marginKiosco.pct.toFixed(1),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    // BOM so Excel reads UTF-8 accents correctly.
    const csv = "﻿" + [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "costos-y-precios.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applySuggested}
          disabled={busy}
          className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          {busy ? "Aplicando…" : "Aplicar todos los precios sugeridos"}
        </button>
        <button
          type="button"
          onClick={exportExcel}
          className="border border-line px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:border-black"
        >
          Exportar a Excel
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          No hay productos con empanados activos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-cream/40">
              <tr>
                {[
                  "Producto",
                  "Empanado",
                  "Costo/kg",
                  "Sugerido",
                  "Público",
                  "Mayorista",
                  "Kiosco",
                  "M. Minorista",
                  "M. Mayorista",
                  "M. Kiosco",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <PricingRowView
                  key={`${r.productId}-${r.breadcrumbType}`}
                  row={r}
                  onSaved={() => router.refresh()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PricingRowView({
  row,
  onSaved,
}: {
  row: PricingRow;
  onSaved: () => void;
}) {
  return (
    <tr>
      <td className="px-3 py-2 font-bold text-ink">{row.productName}</td>
      <td className="px-3 py-2 text-muted">{row.breadcrumbLabel}</td>
      <td className="px-3 py-2">
        <EditableNumber
          value={row.cost}
          onSave={(v) =>
            fetch("/api/admin/pricing/cost", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: row.productId,
                breadcrumbType: row.breadcrumbType,
                cost: v,
              }),
            })
          }
          onSaved={onSaved}
        />
      </td>
      <td className="px-3 py-2 text-muted">{pesos(row.suggestedPrice)}</td>
      <td className="px-3 py-2">
        <EditableNumber
          value={row.publicPrice}
          onSave={(v) =>
            fetch("/api/admin/pricing/price", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: row.productId,
                breadcrumbType: row.breadcrumbType,
                price: v,
              }),
            })
          }
          onSaved={onSaved}
        />
      </td>
      <td className="px-3 py-2 text-muted">{pesos(row.mayoristaPrice)}</td>
      <td className="px-3 py-2 text-muted">{pesos(row.kioscoPrice)}</td>
      <MarginCell m={row.marginMinorista} />
      <MarginCell m={row.marginMayorista} />
      <MarginCell m={row.marginKiosco} />
    </tr>
  );
}

function MarginCell({ m }: { m: { pesos: number; pct: number } }) {
  return (
    <td className={`px-3 py-2 ${marginClass(m.pct)}`}>
      <span className="font-bold">{pesos(m.pesos)}</span>
      <span className="ml-1 text-[11px]">({m.pct.toFixed(0)}%)</span>
    </td>
  );
}

function EditableNumber({
  value,
  disabled,
  icon,
  onSave,
  onSaved,
}: {
  value: number;
  disabled?: boolean;
  icon?: string;
  onSave: (v: number) => Promise<Response>;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const [busy, setBusy] = useState(false);

  async function commit() {
    setEditing(false);
    if (Number(val) === value) return;
    setBusy(true);
    try {
      const res = await onSave(Number(val));
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo guardar.");
        setVal(String(value));
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 text-ink" title="Costo calculado por receta">
        {icon && (
          <span className="font-black text-[11px] text-muted">{icon}</span>
        )}
        {new Intl.NumberFormat("es-AR").format(value)}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setVal(String(value));
          setEditing(true);
        }}
        className="rounded px-2 py-1 text-ink hover:bg-cream"
        disabled={busy}
      >
        {new Intl.NumberFormat("es-AR").format(value)}
      </button>
    );
  }

  return (
    <input
      type="number"
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setVal(String(value));
          setEditing(false);
        }
      }}
      className="w-24 rounded border border-black bg-white px-2 py-1 text-ink outline-none"
    />
  );
}
