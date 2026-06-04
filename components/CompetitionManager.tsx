"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CompetitorRow = {
  id: string;
  productName: string;
  competitor: string;
  pricePerKg: number;
};
type ComparisonRow = {
  productName: string;
  myPrice: number;
  competitorAvg: number;
  competitorsCount: number;
  diffPesos: number;
  diffPct: number;
  position: "BELOW" | "NEAR" | "ABOVE";
};

const inputClass =
  "w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CompetitionManager({
  competitors,
  comparison,
  productNames,
}: {
  competitors: CompetitorRow[];
  comparison: ComparisonRow[];
  productNames: string[];
}) {
  return (
    <div className="space-y-10">
      {/* Comparison table */}
      <section>
        <h2 className="mb-3 font-black uppercase tracking-tight text-xl text-ink">
          Comparación
        </h2>
        {comparison.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-muted">
            Cargá precios de competencia con el nombre de tus productos para ver
            la comparación.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-cream/40">
                <tr>
                  {["Producto", "Mi precio", "Prom. competencia", "Diferencia", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 font-bold uppercase tracking-wide text-[10px] text-muted"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comparison.map((r) => (
                  <tr key={r.productName}>
                    <td className="px-3 py-2 font-bold text-ink">
                      {r.productName}
                    </td>
                    <td className="px-3 py-2 text-ink">{pesos(r.myPrice)}</td>
                    <td className="px-3 py-2 text-muted">
                      {pesos(r.competitorAvg)}
                      <span className="ml-1 text-[10px]">
                        ({r.competitorsCount})
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 font-bold ${
                        r.position === "BELOW"
                          ? "text-green-700"
                          : r.position === "ABOVE"
                          ? "text-red-600"
                          : "text-ink"
                      }`}
                    >
                      {r.diffPesos >= 0 ? "+" : ""}
                      {pesos(r.diffPesos)} ({r.diffPct.toFixed(0)}%)
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          r.position === "BELOW"
                            ? "bg-green-100 text-green-700"
                            : r.position === "ABOVE"
                            ? "bg-red-100 text-red-700"
                            : "bg-cream text-muted"
                        }`}
                      >
                        {r.position === "BELOW"
                          ? "Más barato"
                          : r.position === "ABOVE"
                          ? "Caro"
                          : "En línea"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Competitor prices list */}
      <section>
        <h2 className="mb-3 font-black uppercase tracking-tight text-xl text-ink">
          Precios de competencia
        </h2>
        <NewCompetitor productNames={productNames} />
        {competitors.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-muted">
            Todavía no cargaste precios de competencia.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {competitors.map((c) => (
              <CompetitorItem key={c.id} row={c} productNames={productNames} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function NewCompetitor({ productNames }: { productNames: string[] }) {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          competitor,
          pricePerKg: Number(price),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      setProductName("");
      setCompetitor("");
      setPrice("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-4"
    >
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Producto
        </span>
        <input
          list="product-names"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className={inputClass}
          placeholder="Nombre"
          required
        />
        <datalist id="product-names">
          {productNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Competidor
        </span>
        <input
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          className={inputClass}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Precio/kg ($)
        </span>
        <input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass}
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
      >
        Agregar
      </button>
      {err && <p className="w-full text-xs font-bold text-red-600">{err}</p>}
    </form>
  );
}

function CompetitorItem({
  row,
  productNames,
}: {
  row: CompetitorRow;
  productNames: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [productName, setProductName] = useState(row.productName);
  const [competitor, setCompetitor] = useState(row.competitor);
  const [price, setPrice] = useState(String(row.pricePerKg));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/competitors/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          competitor,
          pricePerKg: Number(price),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo guardar.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este precio?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/competitors/${row.id}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-cream/30 p-3">
        <input
          list="product-names"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className={inputClass + " max-w-[180px]"}
        />
        <input
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          className={inputClass + " max-w-[140px]"}
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass + " max-w-[110px]"}
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-black px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-muted"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <div>
        <p className="font-bold text-ink">
          {row.productName}{" "}
          <span className="text-muted">· {row.competitor}</span>
        </p>
        <p className="text-xs text-muted">{pesos(row.pricePerKg)}/kg</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-red-600 disabled:opacity-40"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
