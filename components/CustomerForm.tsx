"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "MINORISTA", label: "Minorista", discount: 10 },
  { value: "MAYORISTA", label: "Mayorista", discount: 25 },
  { value: "KIOSCO", label: "Kiosco", discount: 30 },
];

export type CustomerValues = {
  id?: string;
  name: string;
  type: string;
  defaultDiscount: number;
  phone: string;
  notes: string;
  neighborhood: string;
  lot: string;
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

// Create/edit form for a customer. The discount auto-fills from the type but
// stays editable.
export default function CustomerForm({
  initial,
  mode,
  onDone,
  neighborhoods = [],
}: {
  initial: CustomerValues;
  mode: "create" | "edit";
  onDone?: () => void;
  neighborhoods?: string[]; // existing barrios, for the picker datalist
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [type, setType] = useState(initial.type || "MINORISTA");
  const [discount, setDiscount] = useState(String(initial.defaultDiscount));
  const [phone, setPhone] = useState(initial.phone);
  const [notes, setNotes] = useState(initial.notes);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [lot, setLot] = useState(initial.lot);
  // Track whether the user manually edited the discount; if not, follow type.
  const [discountTouched, setDiscountTouched] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeType(value: string) {
    setType(value);
    if (!discountTouched) {
      const def = TYPES.find((t) => t.value === value)?.discount ?? 0;
      setDiscount(String(def));
    }
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Poné un nombre.");
    setSaving(true);
    try {
      const payload = {
        name,
        type,
        defaultDiscount: Number(discount),
        phone,
        notes,
        neighborhood,
        lot,
      };
      const url =
        mode === "create"
          ? "/api/admin/customers"
          : `/api/admin/customers/${initial.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar.");
      router.refresh();
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial.id) return;
    if (!confirm(`¿Eliminar a "${initial.name}"? Sus ventas se conservan.`))
      return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${initial.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar.");
      router.refresh();
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Nombre
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Kiosco La Esquina"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Tipo
          </span>
          <select
            value={type}
            onChange={(e) => changeType(e.target.value)}
            className={inputClass}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.discount}%)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Descuento por defecto %
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value);
              setDiscountTouched(true);
            }}
            className="w-32 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Teléfono (opcional)
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="Ej: 11 5555 5555"
          />
        </label>
      </div>

      {/* Barrio + lote */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Barrio
          </span>
          <input
            type="text"
            list="barrios-list"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className={inputClass}
            placeholder="Ej: Nordelta"
          />
          <datalist id="barrios-list">
            {neighborhoods.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Lote
          </span>
          <input
            type="text"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className={inputClass}
            placeholder="Ej: A-142"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
          Notas (opcional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Ej: entrega los martes, paga a 15 días"
        />
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
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              disabled={saving}
              className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
          >
            {saving ? "Guardando…" : mode === "create" ? "Crear cliente" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
