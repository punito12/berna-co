"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DiscountCodeValues = {
  id?: string;
  code: string;
  kind: string; // PERCENT | FIXED
  value: number;
  active: boolean;
  expiresAt: string; // yyyy-mm-dd or ""
  maxUses: number;
  minTotal: number;
  usedCount?: number;
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

function pesos(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

// One editable discount-code row (also used as the "new" form when no id).
function CodeForm({
  initial,
  onDone,
}: {
  initial: DiscountCodeValues;
  onDone: () => void;
}) {
  const router = useRouter();
  const mode = initial.id ? "edit" : "create";
  const [code, setCode] = useState(initial.code);
  const [kind, setKind] = useState(initial.kind);
  const [value, setValue] = useState(String(initial.value));
  const [active, setActive] = useState(initial.active);
  const [expiresAt, setExpiresAt] = useState(initial.expiresAt);
  const [maxUses, setMaxUses] = useState(String(initial.maxUses));
  const [minTotal, setMinTotal] = useState(String(initial.minTotal));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        code,
        kind,
        value: Number(value),
        active,
        expiresAt: expiresAt || null,
        maxUses: Number(maxUses) || 0,
        minTotal: Number(minTotal) || 0,
      };
      const url = initial.id
        ? `/api/admin/discounts/${initial.id}`
        : "/api/admin/discounts";
      const res = await fetch(url, {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar.");
      router.refresh();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial.id) return;
    if (!confirm(`¿Eliminar el código "${initial.code}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/discounts/${initial.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
      onDone();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Código
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={inputClass}
            placeholder="BERNA10"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Tipo
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={inputClass}
          >
            <option value="PERCENT">Porcentaje (%)</option>
            <option value="FIXED">Monto fijo ($)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            {kind === "PERCENT" ? "Porcentaje" : "Monto $"}
          </span>
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Vence (opcional)
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Límite de usos (0 = sin límite)
          </span>
          <input
            type="number"
            min={0}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Compra mínima $ (0 = sin mínimo)
          </span>
          <input
            type="number"
            min={0}
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-black"
        />
        <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
          Activo
        </span>
      </label>

      {error && <p className="text-sm font-bold text-ink">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
          >
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
          >
            {saving ? "…" : mode === "create" ? "Crear código" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Manager: list of codes + create form.
export default function DiscountManager({
  codes,
}: {
  codes: DiscountCodeValues[];
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4">
        {creating ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-5">
            <p className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
              Nuevo código
            </p>
            <CodeForm
              initial={{
                code: "",
                kind: "PERCENT",
                value: 10,
                active: true,
                expiresAt: "",
                maxUses: 0,
                minTotal: 0,
              }}
              onDone={() => setCreating(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
          >
            + Nuevo código
          </button>
        )}
      </div>

      {codes.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay códigos.
        </p>
      ) : (
        <div className="space-y-3">
          {codes.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold uppercase tracking-tight text-ink">
                    {c.code}
                    {!c.active && (
                      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-[10px] text-white">
                        Inactivo
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.kind === "PERCENT" ? `${c.value}% off` : `${pesos(c.value)} off`}
                    {c.minTotal > 0 ? ` · desde ${pesos(c.minTotal)}` : ""}
                    {c.maxUses > 0
                      ? ` · usos ${c.usedCount ?? 0}/${c.maxUses}`
                      : ` · usos ${c.usedCount ?? 0}`}
                    {c.expiresAt ? ` · vence ${c.expiresAt}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === c.id ? null : c.id!)}
                  className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
                >
                  {editingId === c.id ? "Cerrar" : "Editar"}
                </button>
              </div>
              {editingId === c.id && (
                <div className="mt-5 border-t border-line pt-5">
                  <CodeForm initial={c} onDone={() => setEditingId(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
