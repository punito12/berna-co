"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "CARNE", label: "Carne" },
  { value: "HUEVOS", label: "Huevos" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "SERVICIOS", label: "Servicios" },
  { value: "OTROS", label: "Otros" },
];
const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label])
);

export type SupplierRow = {
  id: string;
  name: string;
  type: string;
  contact: string | null;
  notes: string | null;
  defaultDueDays: number;
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

// CRUD list for suppliers: a "new" form on top, then each supplier editable
// inline.
export default function SupplierManager({
  suppliers,
}: {
  suppliers: SupplierRow[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-4">
        {creating ? (
          <SupplierForm mode="create" onDone={() => setCreating(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
          >
            + Nuevo proveedor
          </button>
        )}
      </div>

      {suppliers.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no cargaste proveedores.
        </p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <SupplierItem key={s.id} supplier={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierItem({ supplier }: { supplier: SupplierRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (
      !confirm(
        `¿Eliminar a ${supplier.name}? Se borran también sus compras y pagos.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo eliminar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <SupplierForm
        mode="edit"
        initial={supplier}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <div>
        <p className="font-bold uppercase tracking-tight text-ink">
          {supplier.name}
          <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            {TYPE_LABELS[supplier.type] ?? supplier.type}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {supplier.contact || "Sin contacto"} · vence a{" "}
          {supplier.defaultDueDays} días
        </p>
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

function SupplierForm({
  mode,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: SupplierRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "CARNE");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [defaultDueDays, setDefaultDueDays] = useState(
    String(initial?.defaultDueDays ?? 30)
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const url =
        mode === "create"
          ? "/api/admin/suppliers"
          : `/api/admin/suppliers/${initial!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          contact,
          notes,
          defaultDueDays: Number(defaultDueDays) || 0,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      router.refresh();
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Tipo">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contacto">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className={inputClass}
            placeholder="Teléfono / email"
          />
        </Field>
        <Field label="Vencimiento por defecto (días)">
          <input
            type="number"
            min={0}
            value={defaultDueDays}
            onChange={(e) => setDefaultDueDays(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notas">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="Opcional"
            />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-sm font-bold text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
