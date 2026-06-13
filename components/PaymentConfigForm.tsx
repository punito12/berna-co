"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethodConfigValues } from "@/lib/payment-config";

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

export default function PaymentConfigForm({
  initial,
}: {
  initial: PaymentMethodConfigValues;
}) {
  const router = useRouter();
  // Efectivo y transferencia comparten un único descuento. Sembramos desde el
  // valor cargado (si difirieran por datos viejos, tomamos el que esté).
  const [descuento, setDescuento] = useState(
    String(
      initial.efectivoDiscountPercent || initial.transferenciaDiscountPercent
    )
  );
  const [alias, setAlias] = useState(initial.aliasMercadoPago);
  const [cbu, setCbu] = useState(initial.cbu);
  const [whatsapp, setWhatsapp] = useState(initial.whatsappNumber);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/payment-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Mismo descuento para ambos métodos.
          efectivoDiscountPercent: Number(descuento),
          transferenciaDiscountPercent: Number(descuento),
          aliasMercadoPago: alias,
          cbu,
          whatsappNumber: whatsapp,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error || "No se pudo guardar.");
        return;
      }
      setMsg("✓ Guardado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-lg space-y-5 rounded-lg border border-line bg-white p-5"
    >
      <div>
        <h2 className="mb-3 font-black uppercase tracking-tight text-sm text-muted">
          Descuento por pago
        </h2>
        <Field label="Descuento efectivo y transferencia (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
            className={inputClass}
          />
        </Field>
        <p className="mt-2 text-xs text-muted">
          Un solo descuento, igual para efectivo y transferencia. 0% = sin
          descuento (no se muestra al cliente). Mercado Pago nunca lleva
          descuento.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-black uppercase tracking-tight text-sm text-muted">
          Datos para transferencia
        </h2>
        <div className="space-y-3">
          <Field label="Alias Mercado Pago">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className={inputClass}
              placeholder="bernaco.mp"
            />
          </Field>
          <Field label="CBU (opcional)">
            <input
              value={cbu}
              onChange={(e) => setCbu(e.target.value)}
              className={inputClass}
              placeholder="0000000000000000000000"
            />
          </Field>
          <Field label="WhatsApp (para el comprobante)">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={inputClass}
              placeholder="+5491112345678"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        {msg && <span className="text-sm font-bold text-ink">{msg}</span>}
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
