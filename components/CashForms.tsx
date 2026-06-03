"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INCOME_SOURCE_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  MERCADO_PAGO: "Mercado Pago",
  TRANSFERENCIA: "Transferencia",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Two side-by-side forms: register a manual income or an expense in Caja.
export default function CashForms({
  categories,
  sources,
}: {
  categories: string[];
  sources: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <IncomeForm sources={sources} />
      <ExpenseForm categories={categories} />
    </div>
  );
}

function IncomeForm({ sources }: { sources: string[] }) {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState(sources[0] ?? "EFECTIVO");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "INCOME",
          date,
          amount: Number(amount),
          description,
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "No se pudo guardar.");
        return;
      }
      setAmount("");
      setDescription("");
      setMsg("✓ Ingreso cargado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-white p-5"
    >
      <h2 className="mb-4 font-black uppercase tracking-tight text-lg text-green-700">
        Cargar ingreso
      </h2>
      <div className="space-y-3">
        <Field label="Fecha">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Monto ($)">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="0"
            required
          />
        </Field>
        <Field label="Descripción">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Ej: Venta feria del domingo"
            required
          />
        </Field>
        <Field label="Origen">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputClass}
          >
            {sources.map((s) => (
              <option key={s} value={s}>
                {INCOME_SOURCE_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full bg-green-700 px-4 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Agregar ingreso"}
      </button>
      {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
    </form>
  );
}

function ExpenseForm({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Otros");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "EXPENSE",
          date,
          amount: Number(amount),
          description,
          category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "No se pudo guardar.");
        return;
      }
      setAmount("");
      setDescription("");
      setMsg("✓ Gasto cargado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-white p-5"
    >
      <h2 className="mb-4 font-black uppercase tracking-tight text-lg text-red-600">
        Cargar gasto
      </h2>
      <div className="space-y-3">
        <Field label="Fecha">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Monto ($)">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="0"
            required
          />
        </Field>
        <Field label="Descripción">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Ej: Compra de carne"
            required
          />
        </Field>
        <Field label="Categoría">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full bg-red-600 px-4 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Agregar gasto"}
      </button>
      {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
    </form>
  );
}

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

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
