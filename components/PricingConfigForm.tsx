"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingConfigValues } from "@/lib/pricing";

const inputClass =
  "w-32 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

export default function PricingConfigForm({
  initial,
}: {
  initial: PricingConfigValues;
}) {
  const router = useRouter();
  const [sueldo, setSueldo] = useState(String(initial.sueldoPercent));
  const [utilidad, setUtilidad] = useState(String(initial.utilidadPercent));
  const [mayorista, setMayorista] = useState(
    String(initial.descuentoMayoristaPercent)
  );
  const [kiosco, setKiosco] = useState(String(initial.descuentoKioscoPercent));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/pricing/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sueldoPercent: Number(sueldo),
          utilidadPercent: Number(utilidad),
          descuentoMayoristaPercent: Number(mayorista),
          descuentoKioscoPercent: Number(kiosco),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error || "No se pudo guardar.");
        return;
      }
      setMsg("✓ Parámetros guardados. La tabla se recalcula con estos valores.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-md rounded-lg border border-line bg-white p-5"
    >
      <div className="space-y-3">
        <Field label="Sueldo (%)" value={sueldo} onChange={setSueldo} />
        <Field label="Utilidad (%)" value={utilidad} onChange={setUtilidad} />
        <Field
          label="Descuento mayorista (%)"
          value={mayorista}
          onChange={setMayorista}
        />
        <Field
          label="Descuento kiosco (%)"
          value={kiosco}
          onChange={setKiosco}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar parámetros"}
      </button>
      {msg && <p className="mt-3 text-sm font-bold text-ink">{msg}</p>}
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        required
      />
    </label>
  );
}
