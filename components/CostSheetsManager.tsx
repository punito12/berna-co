"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeCostSheet,
  type CostSheetRow,
  type CostSheetInput,
} from "@/lib/cost-sheets";

type ProductOption = {
  id: string;
  name: string;
  breadcrumbs: { code: string; label: string }[];
};

// Display number with up to 2 decimals, dropping trailing zeros.
function n2(v: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(v);
}
function money(v: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(v);
}

export default function CostSheetsManager({
  products,
  productId,
  breadcrumbType,
  sheets,
}: {
  products: ProductOption[];
  productId: string;
  breadcrumbType: string;
  sheets: CostSheetRow[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const product = products.find((p) => p.id === productId);

  function navigate(next: { product?: string; bc?: string }) {
    const sp = new URLSearchParams();
    const pid = next.product ?? productId;
    let bc = next.bc ?? breadcrumbType;
    if (next.product && next.product !== productId) {
      const p = products.find((x) => x.id === next.product);
      bc = p?.breadcrumbs[0]?.code ?? "";
    }
    if (pid) sp.set("product", pid);
    if (bc) sp.set("bc", bc);
    router.push(`/admin/catalogo/costos?${sp.toString()}`);
  }

  return (
    <div>
      {/* Selector + new */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
              Producto
            </span>
            <select
              value={productId}
              onChange={(e) => navigate({ product: e.target.value })}
              className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">— Elegí —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
              Empanado
            </span>
            <select
              value={breadcrumbType}
              onChange={(e) => navigate({ bc: e.target.value })}
              disabled={!product}
              className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {!product && <option value="">—</option>}
              {product?.breadcrumbs.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={!productId || !breadcrumbType}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
        >
          + Nueva planilla
        </button>
      </div>

      {/* New sheet form */}
      {creating && (
        <div className="mb-6">
          <CostSheetForm
            productId={productId}
            breadcrumbType={breadcrumbType}
            onClose={() => setCreating(false)}
          />
        </div>
      )}

      {/* Cards (horizontal scroll) */}
      {sheets.length === 0 && !creating ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          {productId
            ? "No hay planillas para este producto y empanado. Creá la primera con “+ Nueva planilla”."
            : "Elegí un producto y un empanado."}
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {sheets.map((s) => (
            <SheetCard key={s.id} sheet={s} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Card (read mode) -------------------------------------------------------

function SheetCard({
  sheet,
  onChanged,
}: {
  sheet: CostSheetRow;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = sheet.computed;

  async function duplicate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cost-sheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo duplicar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar esta planilla?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cost-sheets/${sheet.id}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="w-[420px] shrink-0">
        <CostSheetForm
          productId={sheet.productId}
          breadcrumbType={sheet.breadcrumbType}
          existing={sheet}
          onClose={() => {
            setEditing(false);
            onChanged();
          }}
        />
      </div>
    );
  }

  const fecha = sheet.fecha.toLocaleDateString("es-AR");

  return (
    <div className="w-[420px] shrink-0 rounded-lg border border-line bg-white">
      {/* header */}
      <div className="flex items-center justify-between border-b border-black bg-ink px-4 py-2 text-white">
        <span className="font-black uppercase tracking-widest text-xs">
          Planilla costos
        </span>
        <span className="font-bold text-xs">Fecha: {fecha}</span>
      </div>

      <div className="p-4 text-sm">
        {/* materia prima table */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1">
          <Head />
          <Line label="Compra" qty={n2(sheet.compraKg)} unit={sheet.compraPrecioUnit} total={c.compraTotal} />
          <Line label="Limpio/Neto" qty={n2(sheet.limpioKg)} unit={sheet.compraPrecioUnit} total={c.limpioTotal} />
          <Line label="Desperdicio" qty={n2(c.desperdicioKg)} unit={sheet.compraPrecioUnit} total={c.desperdicioTotal} muted />
          <Line label="Huevos" qty={String(sheet.huevosCantidad)} unit={sheet.huevosPrecioUnit} total={c.huevosTotal} />
          <Line label="Integral" qty={n2(sheet.integralKg)} unit={sheet.integralPrecioUnit} total={c.integralTotal} />
          <Line label="Tradicional" qty={n2(sheet.tradicionalKg)} unit={sheet.tradicionalPrecioUnit} total={c.tradicionalTotal} />
          <Line label="Marinada" qty={n2(sheet.marinadaCantidad)} unit={sheet.marinadaPrecioUnit} total={c.marinadaTotal} />
          <TotalLine label="Subtotal" value={c.subtotal} />
        </div>

        {/* producto final */}
        <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 border-t border-line pt-3">
          <div className="col-span-4 flex justify-between">
            <span className="font-bold text-ink">Prod. final: {n2(sheet.prodFinalKg)} kg</span>
            <span className="font-bold text-ink">
              1° Costo x kg: {money(c.costo1xKg)}
            </span>
          </div>
          <Line label="Bolsa" qty={String(sheet.bolsaCantidad)} unit={sheet.bolsaPrecioUnit} total={c.bolsaTotal} />
          <Line label="Etiqueta" qty={String(sheet.etiquetaCantidad)} unit={sheet.etiquetaPrecioUnit} total={c.etiquetaTotal} />
        </div>

        {/* results */}
        <div className="mt-3 space-y-1 border-t border-line pt-3">
          <Result label="2° Costo x kg" value={money(c.costo2xKg)} />
          <Result label={`Sueldo ${sheet.sueldoPercent}%`} value={money(c.sueldoMonto)} />
          <Result label={`Utilidades ${sheet.utilidadesPercent}%`} value={money(c.utilidadesMonto)} />
          <Result label="Precio final" value={money(c.precioFinal)} strong />
        </div>

        {sheet.notas && (
          <p className="mt-3 border-t border-line pt-2 text-xs italic text-muted">
            {sheet.notas}
          </p>
        )}

        {/* actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 border border-line px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-ink hover:border-black"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={duplicate}
            disabled={busy}
            className="flex-1 border border-line px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-ink hover:border-black disabled:opacity-50"
          >
            Duplicar
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="border border-line px-3 py-1.5 font-bold uppercase tracking-widest text-[11px] text-muted hover:text-red-600 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function Head() {
  return (
    <>
      <span />
      <span className="text-right font-bold uppercase tracking-wide text-[9px] text-muted">
        Cant.
      </span>
      <span className="text-right font-bold uppercase tracking-wide text-[9px] text-muted">
        P. Unit.
      </span>
      <span className="text-right font-bold uppercase tracking-wide text-[9px] text-muted">
        P. Total
      </span>
    </>
  );
}

function Line({
  label,
  qty,
  unit,
  total,
  muted,
}: {
  label: string;
  qty: string;
  unit: number;
  total: number;
  muted?: boolean;
}) {
  return (
    <>
      <span className={muted ? "text-muted" : "text-ink"}>{label}</span>
      <span className="text-right tabular-nums text-ink">{qty}</span>
      <span className="text-right tabular-nums text-ink">{money(unit)}</span>
      <span className="text-right tabular-nums font-bold text-ink">
        {money(total)}
      </span>
    </>
  );
}

function TotalLine({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span className="col-span-2" />
      <span className="text-right font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <span className="text-right font-black tabular-nums text-ink">
        {money(value)}
      </span>
    </>
  );
}

function Result({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        strong ? "border-t border-line pt-1" : ""
      }`}
    >
      <span
        className={`uppercase tracking-wide ${
          strong ? "font-black text-ink text-sm" : "text-xs text-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          strong ? "font-black text-lg text-ink" : "font-bold text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ---- Form (create / edit) ---------------------------------------------------

type FormState = Record<string, string>;

const FIELD_DEFS: { key: keyof CostSheetInput; label: string; section: string }[] = [
  { key: "compraKg", label: "Compra (kg)", section: "Materia prima" },
  { key: "compraPrecioUnit", label: "Precio unit. (x kg)", section: "Materia prima" },
  { key: "limpioKg", label: "Limpio/Neto (kg)", section: "Materia prima" },
  { key: "huevosCantidad", label: "Huevos (cant.)", section: "Otros ítems" },
  { key: "huevosPrecioUnit", label: "Huevos (precio)", section: "Otros ítems" },
  { key: "integralKg", label: "Integral (kg)", section: "Otros ítems" },
  { key: "integralPrecioUnit", label: "Integral (precio)", section: "Otros ítems" },
  { key: "tradicionalKg", label: "Tradicional (kg)", section: "Otros ítems" },
  { key: "tradicionalPrecioUnit", label: "Tradicional (precio)", section: "Otros ítems" },
  { key: "marinadaCantidad", label: "Marinada (cant.)", section: "Otros ítems" },
  { key: "marinadaPrecioUnit", label: "Marinada (precio)", section: "Otros ítems" },
  { key: "prodFinalKg", label: "Prod. final (kg)", section: "Producto final" },
  { key: "bolsaCantidad", label: "Bolsa (cant.)", section: "Producto final" },
  { key: "bolsaPrecioUnit", label: "Bolsa (precio)", section: "Producto final" },
  { key: "etiquetaCantidad", label: "Etiqueta (cant.)", section: "Producto final" },
  { key: "etiquetaPrecioUnit", label: "Etiqueta (precio)", section: "Producto final" },
  { key: "sueldoPercent", label: "Sueldo %", section: "Parámetros" },
  { key: "utilidadesPercent", label: "Utilidades %", section: "Parámetros" },
];

function CostSheetForm({
  productId,
  breadcrumbType,
  existing,
  onClose,
}: {
  productId: string;
  breadcrumbType: string;
  existing?: CostSheetRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(
    existing ? existing.fecha.toISOString().slice(0, 10) : today
  );
  const [notas, setNotas] = useState(existing?.notas ?? "");
  const [state, setState] = useState<FormState>(() => {
    const s: FormState = {};
    for (const f of FIELD_DEFS) {
      const v = existing
        ? (existing[f.key] as number)
        : f.key === "sueldoPercent"
        ? 15
        : f.key === "utilidadesPercent"
        ? 50
        : 0;
      s[f.key] = String(v ?? 0);
    }
    return s;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const computed = useMemo(() => {
    const num = (k: string) => Number(state[k]) || 0;
    return computeCostSheet({
      compraKg: num("compraKg"),
      compraPrecioUnit: num("compraPrecioUnit"),
      limpioKg: num("limpioKg"),
      huevosCantidad: num("huevosCantidad"),
      huevosPrecioUnit: num("huevosPrecioUnit"),
      integralKg: num("integralKg"),
      integralPrecioUnit: num("integralPrecioUnit"),
      tradicionalKg: num("tradicionalKg"),
      tradicionalPrecioUnit: num("tradicionalPrecioUnit"),
      marinadaCantidad: num("marinadaCantidad"),
      marinadaPrecioUnit: num("marinadaPrecioUnit"),
      prodFinalKg: num("prodFinalKg"),
      bolsaCantidad: num("bolsaCantidad"),
      bolsaPrecioUnit: num("bolsaPrecioUnit"),
      etiquetaCantidad: num("etiquetaCantidad"),
      etiquetaPrecioUnit: num("etiquetaPrecioUnit"),
      sueldoPercent: num("sueldoPercent"),
      utilidadesPercent: num("utilidadesPercent"),
    });
  }, [state]);

  const sections = [...new Set(FIELD_DEFS.map((f) => f.section))];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const payload: Record<string, unknown> = {
      productId,
      breadcrumbType,
      fecha,
      notas,
    };
    for (const f of FIELD_DEFS) payload[f.key] = Number(state[f.key]) || 0;
    try {
      const res = await fetch(
        existing
          ? `/api/admin/cost-sheets/${existing.id}`
          : "/api/admin/cost-sheets",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-white p-5"
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Fecha
          </span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
            Notas (opcional)
          </span>
          <input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>

      {sections.map((sec) => (
        <div key={sec} className="mb-4">
          <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
            {sec}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FIELD_DEFS.filter((f) => f.section === sec).map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-[10px] text-muted">
                  {f.label}
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={state[f.key]}
                  onChange={(e) =>
                    setState((s) => ({ ...s, [f.key]: e.target.value }))
                  }
                  className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-black"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* live preview */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-line bg-cream/40 p-3 text-sm sm:grid-cols-4">
        <Mini label="Subtotal" value={money(computed.subtotal)} />
        <Mini label="1° Costo/kg" value={money(computed.costo1xKg)} />
        <Mini label="2° Costo/kg" value={money(computed.costo2xKg)} />
        <Mini label="Precio final" value={money(computed.precioFinal)} strong />
      </div>

      {err && <p className="mb-3 text-sm font-bold text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : existing ? "Guardar cambios" : "Crear planilla"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Mini({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="font-bold uppercase tracking-wide text-[9px] text-muted">
        {label}
      </p>
      <p className={`tabular-nums ${strong ? "font-black text-ink" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
