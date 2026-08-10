"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DeliveryConfig,
  LocalityConfig,
  LocalityScheduleDay,
} from "@/lib/delivery-config";

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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

  useEffect(() => {
    setMode(initial.mode);
    setPickupAddress(initial.pickupAddress);
    setLocalities(initial.localities);
  }, [initial]);

  function setLocality(i: number, patch: Partial<LocalityConfig>) {
    setLocalities((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );
  }
  function addLocality() {
    setLocalities((prev) => [
      ...prev,
      {
        name: "",
        enabled: true,
        shippingCost: 0,
        minimumUnits: 0,
        schedule: [],
      },
    ]);
  }
  function removeLocality(i: number) {
    setLocalities((prev) => prev.filter((_, idx) => idx !== i));
  }
  function setLocalitySchedule(i: number, schedule: LocalityScheduleDay[]) {
    setLocality(i, { schedule });
  }
  function toggleDay(i: number, dayOfWeek: number, active: boolean) {
    const current = localities[i]?.schedule ?? [];
    if (active) {
      if (current.some((day) => day.dayOfWeek === dayOfWeek)) return;
      setLocalitySchedule(i, [
        ...current,
        { dayOfWeek, slots: [{ from: "10:00", to: "14:00" }] },
      ]);
      return;
    }
    setLocalitySchedule(
      i,
      current.filter((day) => day.dayOfWeek !== dayOfWeek)
    );
  }
  function addSlot(i: number, dayOfWeek: number) {
    const current = localities[i]?.schedule ?? [];
    setLocalitySchedule(
      i,
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, slots: [...day.slots, { from: "10:00", to: "14:00" }] }
          : day
      )
    );
  }
  function updateSlot(
    i: number,
    dayOfWeek: number,
    slotIndex: number,
    patch: { from?: string; to?: string }
  ) {
    const current = localities[i]?.schedule ?? [];
    setLocalitySchedule(
      i,
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              slots: day.slots.map((slot, idx) =>
                idx === slotIndex ? { ...slot, ...patch } : slot
              ),
            }
          : day
      )
    );
  }
  function removeSlot(i: number, dayOfWeek: number, slotIndex: number) {
    const current = localities[i]?.schedule ?? [];
    setLocalitySchedule(
      i,
      current
        .map((day) =>
          day.dayOfWeek === dayOfWeek
            ? { ...day, slots: day.slots.filter((_, idx) => idx !== slotIndex) }
            : day
        )
        .filter((day) => day.slots.length > 0)
    );
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
              minimumUnits: Number(l.minimumUnits) || 0,
              schedule: l.schedule ?? [],
            }))
            .filter((l) => l.name),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "No se pudo guardar.");
        return;
      }
      if (data.config) {
        setMode(data.config.mode);
        setPickupAddress(data.config.pickupAddress);
        setLocalities(data.config.localities ?? []);
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
                <label className="col-span-12 sm:col-span-4">
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
                <label className="col-span-6 sm:col-span-3">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                    Mínimo de unidades
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={l.minimumUnits}
                    onChange={(e) =>
                      setLocality(i, {
                        minimumUnits: Math.max(
                          0,
                          Math.floor(Number(e.target.value) || 0)
                        ),
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="col-span-10 sm:col-span-1 flex items-center gap-2 pb-2 text-sm font-bold text-ink">
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
                <p className="col-span-12 text-[11px] leading-5 text-muted">
                  0 unidades = sin mínimo para esta localidad.
                </p>
                <div className="col-span-12 rounded-lg border border-line bg-white p-3">
                  <div className="mb-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-muted">
                      Días y horarios de entrega
                    </span>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Si no configurás horarios propios, esta localidad usa el
                      horario global de envío.
                    </p>
                  </div>
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Días de entrega
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAY_LABELS.map((label, dayOfWeek) => {
                        const active = (l.schedule ?? []).some(
                          (day) => day.dayOfWeek === dayOfWeek
                        );
                        return (
                          <label
                            key={dayOfWeek}
                            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${
                              active
                                ? "border-ink bg-ink text-white"
                                : "border-line bg-cream/50 text-ink"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={(e) =>
                                toggleDay(i, dayOfWeek, e.target.checked)
                              }
                              className="sr-only"
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {(l.schedule ?? []).length === 0 ? (
                    <p className="rounded border border-dashed border-line px-3 py-3 text-sm text-muted">
                      Sin horarios configurados.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[...(l.schedule ?? [])]
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                        .map((day) => (
                          <div
                            key={day.dayOfWeek}
                            className="rounded border border-line bg-cream/30 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-xs font-black uppercase tracking-wide text-ink">
                                {DAY_LABELS[day.dayOfWeek]}
                              </p>
                              <button
                                type="button"
                                onClick={() => addSlot(i, day.dayOfWeek)}
                                className="text-[10px] font-bold uppercase tracking-widest text-ink hover:text-muted"
                              >
                                Agregar horario
                              </button>
                            </div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                              Horarios disponibles
                            </p>
                            <div className="space-y-2">
                              {day.slots.map((slot, slotIndex) => (
                                <div
                                  key={slotIndex}
                                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                                >
                                  <label>
                                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                                      Desde
                                    </span>
                                    <input
                                      type="time"
                                      value={slot.from}
                                      onChange={(e) =>
                                        updateSlot(i, day.dayOfWeek, slotIndex, {
                                          from: e.target.value,
                                        })
                                      }
                                      className={inputClass}
                                    />
                                  </label>
                                  <label>
                                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
                                      Hasta
                                    </span>
                                    <input
                                      type="time"
                                      value={slot.to}
                                      onChange={(e) =>
                                        updateSlot(i, day.dayOfWeek, slotIndex, {
                                          to: e.target.value,
                                        })
                                      }
                                      className={inputClass}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSlot(i, day.dayOfWeek, slotIndex)
                                    }
                                    className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-red-600"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
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
