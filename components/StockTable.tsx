"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BREADCRUMB_LABELS } from "@/lib/products";

// Una fila = un (producto, empanado/variedad). El stock V2 trata cada empanado
// como su propia unidad de producto.
export type StockRow = {
  productId: string;
  productName: string;
  category: string;
  available: boolean;
  breadcrumb: string;
  stock: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  CARNE: "Carne",
  POLLO: "Pollo",
  CERDO: "Cerdo",
  VEGANO: "Vegano",
};

const LOW_STOCK = 3; // umbral de "bajo stock" (solo UI)

type Estado = "DISPONIBLE" | "BAJO" | "SIN";
function estadoOf(stock: number): Estado {
  if (stock <= 0) return "SIN";
  if (stock <= LOW_STOCK) return "BAJO";
  return "DISPONIBLE";
}
const ESTADO_BADGE: Record<Estado, string> = {
  DISPONIBLE: "border-green-200 bg-green-50 text-green-700",
  BAJO: "border-amber-200 bg-amber-50 text-amber-800",
  SIN: "border-red-200 bg-red-50 text-red-700",
};
const ESTADO_LABEL: Record<Estado, string> = {
  DISPONIBLE: "Disponible",
  BAJO: "Bajo stock",
  SIN: "Sin stock",
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

export default function StockTable({ rows }: { rows: StockRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [bc, setBc] = useState("");
  const [estado, setEstado] = useState("");
  // Fila en edición (clave producto__empanado) y su modal de ajuste.
  const [editing, setEditing] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category))].filter(Boolean),
    [rows]
  );
  const breadcrumbs = useMemo(
    () => [...new Set(rows.map((r) => r.breadcrumb))].filter(Boolean),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term && !r.productName.toLowerCase().includes(term)) return false;
      if (cat && r.category !== cat) return false;
      if (bc && r.breadcrumb !== bc) return false;
      if (estado && estadoOf(r.stock) !== estado) return false;
      return true;
    });
  }, [rows, q, cat, bc, estado]);

  const totalUnits = filtered.reduce((a, r) => a + r.stock, 0);

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Buscar producto
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} placeholder="Nombre…" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Empanado / variedad
          </span>
          <select value={bc} onChange={(e) => setBc(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {breadcrumbs.map((b) => (
              <option key={b} value={b}>{BREADCRUMB_LABELS[b] ?? b}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Estado
          </span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="BAJO">Bajo stock</option>
            <option value="SIN">Sin stock</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
            Categoría
          </span>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-2 text-[11px] text-muted">
        {filtered.length} variante(s) · {totalUnits.toLocaleString("es-AR")} unidades en total.
        El umbral de “bajo stock” es {LOW_STOCK} o menos.
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/40">
              <Th>Producto</Th>
              <Th>Empanado / variedad</Th>
              <Th right>Stock actual</Th>
              <Th>Estado</Th>
              <Th right>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-muted">
                  No hay variantes que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const key = `${r.productId}__${r.breadcrumb}`;
                const est = estadoOf(r.stock);
                return (
                  <RowView
                    key={key}
                    row={r}
                    estado={est}
                    open={editing === key}
                    onToggle={() => setEditing(editing === key ? null : key)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function RowView({
  row,
  estado,
  open,
  onToggle,
}: {
  row: StockRow;
  estado: Estado;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className={open ? "bg-cream/20" : ""}>
        <td className="px-3 py-2 text-ink">
          {row.productName}
          {!row.available && (
            <span className="ml-2 rounded bg-cream px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
              Pausado
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-ink/80">
          {BREADCRUMB_LABELS[row.breadcrumb] ?? row.breadcrumb}
        </td>
        <td className="px-3 py-2 text-right font-bold tabular-nums text-ink">
          {row.stock}
        </td>
        <td className="px-3 py-2">
          <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ESTADO_BADGE[estado]}`}>
            {ESTADO_LABEL[estado]}
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="rounded border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted hover:border-black hover:text-ink"
            >
              {open ? "Cerrar" : "Ajustar"}
            </button>
            <Link
              href="/admin/stock/movimientos"
              className="rounded border border-line px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted hover:border-black hover:text-ink"
            >
              Movimientos
            </Link>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-cream/20">
          <td colSpan={5} className="px-3 pb-3">
            <AdjustForm row={row} onDone={onToggle} />
          </td>
        </tr>
      )}
    </>
  );
}

// Ajuste claro: Setear exacto / Sumar / Restar. Todo se traduce a un `delta`
// firmado y se manda al MISMO endpoint de ajuste de siempre (no cambia la lógica
// de mutación: sigue registrando el movimiento con motivo).
function AdjustForm({ row, onDone }: { row: StockRow; onDone: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"SET" | "ADD" | "SUB">("ADD");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("ADJUSTMENT");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const n = Number(qty);
  const valid = qty !== "" && Number.isFinite(n) && n >= 0;
  const delta =
    !valid
      ? 0
      : mode === "SET"
      ? Math.round(n) - row.stock
      : mode === "ADD"
      ? Math.round(n)
      : -Math.round(n);
  const preview = row.stock + delta;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (delta === 0) {
      setErr("El ajuste no cambia el stock (delta 0).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/stock/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: row.productId,
          breadcrumbType: row.breadcrumb,
          delta,
          reason,
          type,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      onDone();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-white p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        Ajustar {row.productName} — {BREADCRUMB_LABELS[row.breadcrumb] ?? row.breadcrumb}
        {" · "}stock actual: <span className="text-ink">{row.stock}</span>
        {valid && delta !== 0 && (
          <span className="text-ink"> → {Math.max(0, preview)}</span>
        )}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Acción
          </span>
          <select value={mode} onChange={(e) => setMode(e.target.value as "SET" | "ADD" | "SUB")} className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black">
            <option value="ADD">Sumar</option>
            <option value="SUB">Restar</option>
            <option value="SET">Setear stock exacto</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Cantidad
          </span>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-24 rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
            placeholder="0"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Tipo
          </span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black">
            <option value="ADJUSTMENT">Ajuste</option>
            <option value="WASTE">Merma</option>
          </select>
        </label>
        <label className="block flex-1 min-w-[180px]">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            Motivo (obligatorio)
          </span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
            placeholder="Ej: conteo físico, rotura, producción"
            required
          />
        </label>
      </div>
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
