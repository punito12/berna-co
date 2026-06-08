"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuantityTier } from "@/lib/quantity-discounts";

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

export default function QuantityDiscountManager({
  tiers,
}: {
  tiers: QuantityTier[];
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Tramos de descuento por cantidad de unidades del pedido. Cada unidad
        cuenta como 1. Se aplica el tramo activo más alto que el cliente
        alcance, sobre el subtotal de productos.
      </p>
      <NewTier />
      {tiers.length === 0 ? (
        <p className="mt-3 rounded-lg border border-line bg-white px-4 py-8 text-center text-sm text-muted">
          Todavía no cargaste tramos.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {tiers.map((t) => (
            <TierRow key={t.id} tier={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewTier() {
  const router = useRouter();
  const [minKg, setMinKg] = useState("");
  const [pct, setPct] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/quantity-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minKg: Number(minKg),
          discountPercent: Number(pct),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo guardar.");
        return;
      }
      setMinKg("");
      setPct("");
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
          Mínimo (unidades)
        </span>
        <input
          type="number"
          min={1}
          step="1"
          value={minKg}
          onChange={(e) => setMinKg(e.target.value)}
          className={inputClass + " w-28"}
          placeholder="5"
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
          Descuento %
        </span>
        <input
          type="number"
          min={1}
          max={100}
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className={inputClass + " w-28"}
          placeholder="10"
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="bg-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
      >
        + Agregar tramo
      </button>
      {err && <p className="w-full text-xs font-bold text-red-600">{err}</p>}
    </form>
  );
}

function TierRow({ tier }: { tier: QuantityTier }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: object) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quantity-discounts/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "No se pudo actualizar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este tramo?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quantity-discounts/${tier.id}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 ${
        tier.active ? "border-line" : "border-dashed border-line opacity-60"
      }`}
    >
      <div>
        <p className="font-bold uppercase tracking-tight text-ink">
          {tier.minKg} unidades → {tier.discountPercent}% off
        </p>
        <p className="text-xs text-muted">
          {tier.active ? "Activo" : "Inactivo"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => patch({ active: !tier.active })}
          disabled={busy}
          className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink disabled:opacity-40"
        >
          {tier.active ? "Desactivar" : "Activar"}
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
