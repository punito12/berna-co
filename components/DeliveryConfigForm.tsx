"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryConfig, LocalityConfig } from "@/lib/delivery-config";

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

export default function DeliveryConfigForm({
  initial,
}: {
  initial: DeliveryConfig;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.mode);
  const [pickupAddress, setPickupAddress] = useState(initial.pickupAddress);
  const [localities, setLocalities] = useState<LocalityConfig[]>(
    initial.localities
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function setLocality(i: number, patch: Partial<LocalityConfig>) {
    setLocalities((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );
  }
  function addLocality() {
    setLocalities((prev) => [
      ...prev,
      { name: "", enabled: true, shippingCost: 0 },
    ]);
  }
  function removeLocality(i: number) {
    setLocalities((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/delivery-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          pickupAddress,
          localities: localities
            .map((l) => ({
              name: l.name.trim(),
              enabled: l.enabled,
              shippingCost: Number(l.shippingCost) || 0,
            }))
            .filter((l) => l.name),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "No se pudo guardar.");
        return;
      }
      setMsg("✓ Guardado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Modo de validación */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 font-black uppercase tracking-tight text-sm text-muted">
          Modo de validación de envío
        </h2>
        <p className="mb-4 text-xs leading-5 text-muted">
          “Localidades manuales” usa una lista de localidades que vos configurás.
          “Chequeo por mapa/dirección actual” usa el sistema de zonas y
          geocodificación de siempre.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeButton
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            title="Localidades manuales"
            desc="El cliente elige su localidad de una lista."
          />
          <ModeButton
            active={mode === "map"}
            onClick={() => setMode("map")}
            title="Chequeo por mapa/dirección actual"
            desc="Verifica la dirección por geocodificación y zonas."
          />
        </div>
      </section>

      {/* Localidades */}
      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black uppercase tracking-tight text-sm text-muted">
              Localidades de envío
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Se usan cuando el modo es “Localidades manuales”. Desactivá una para
              dejar de aceptar envíos ahí sin borrarla.
            </p>
          </div>
          <button
            type="button"
            onClick={addLocality}
            className="shrink-0 bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white"
          >
            Agregar
          </button>
        </div>
        {localities.length === 0 ? (
          <p className="rounded border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
            Todavía no agregaste localidades.
          </p>
        ) : (
          <div className="space-y-2">
            {localities.map((l, i) => (
              <div
                key={i}
                className="grid grid-cols-12 items-end gap-2 rounded border border-line bg-cream/30 p-3"
              >
                <label className="col-span-12 sm:col-span-6">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                    Localidad
                  </span>
                  <input
                    value={l.name}
                    onChange={(e) => setLocality(i, { name: e.target.value })}
                    className={inputClass}
                    placeholder="Ej: Benavídez"
                  />
                </label>
                <label className="col-span-6 sm:col-span-3">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                    Costo de envío ($)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={l.shippingCost}
                    onChange={(e) =>
                      setLocality(i, { shippingCost: Number(e.target.value) || 0 })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="col-span-4 sm:col-span-2 flex items-center gap-2 pb-2 text-sm font-bold text-ink">
                  <input
                    type="checkbox"
                    checked={l.enabled}
                    onChange={(e) => setLocality(i, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-black"
                  />
                  Activa
                </label>
                <div className="col-span-2 sm:col-span-1 pb-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeLocality(i)}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-red-600"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dirección de retiro */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-1 font-black uppercase tracking-tight text-sm text-muted">
          Dirección de retiro
        </h2>
        <p className="mb-3 text-xs leading-5 text-muted">
          Es la que se muestra en el checkout cuando el cliente elige “Pasar a
          retirar”.
        </p>
        <input
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          className={inputClass}
          placeholder="Aristóbulo del Valle 5155, Benavídez"
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        {msg && <span className="text-sm font-bold text-ink">{msg}</span>}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-black"
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span
        className={`mt-1 block text-xs leading-5 ${
          active ? "text-white/70" : "text-muted"
        }`}
      >
        {desc}
      </span>
    </button>
  );
}
