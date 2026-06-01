"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import CheckoutCalendar from "@/components/CheckoutCalendar";
import BernaLogo from "@/components/BernaLogo";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";
import type { DeliveryOptions } from "@/lib/delivery";

type DeliveryType = "DELIVERY" | "PICKUP";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, totalPrice, hydrated, clearCart } = useCart();

  // --- form state ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("DELIVERY");
  // Structured delivery address.
  const [street, setStreet] = useState(""); // calle + número
  const [locality, setLocality] = useState(""); // localidad
  const [postalCode, setPostalCode] = useState(""); // CP (opcional)
  const [floor, setFloor] = useState(""); // piso/depto (opcional)
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  // --- zone (address → coordinates → polygon) state ---
  // options holds the enabled weekdays + slots for the covered zone.
  const [options, setOptions] = useState<DeliveryOptions | null>(null);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [checkingZone, setCheckingZone] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [notCovered, setNotCovered] = useState(false);
  const [notLocated, setNotLocated] = useState(false);
  // Delivery pricing for the matched zone.
  const [shippingCost, setShippingCost] = useState(0);
  const [freeShippingFrom, setFreeShippingFrom] = useState(0);

  // --- submission state ---
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const covered = Boolean(options);

  // Delivery fee: free when the zone has a threshold and the subtotal reaches it.
  const shipping =
    freeShippingFrom > 0 && totalPrice >= freeShippingFrom ? 0 : shippingCost;
  const grandTotal = totalPrice + shipping;

  // Resets everything tied to a verified address / zone.
  function resetZone() {
    setOptions(null);
    setZoneName(null);
    setNotCovered(false);
    setNotLocated(false);
    setZoneError(null);
    setShippingCost(0);
    setFreeShippingFrom(0);
    setDateIso(null);
    setSlot(null);
  }

  // Geocodes the structured address and checks which zone polygon it lands in.
  // If covered, loads that zone's days + slots; otherwise shows the right msg.
  async function checkZone() {
    if (!street.trim()) return setZoneError("Ingresá la calle y número.");
    if (!locality.trim()) return setZoneError("Ingresá la localidad.");
    setCheckingZone(true);
    resetZone();
    try {
      const res = await fetch("/api/delivery-zone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: street.trim(),
          locality: locality.trim(),
          postalCode: postalCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setZoneError(data?.error ?? "No pudimos verificar tu dirección.");
        return;
      }
      if (!data.covered) {
        // located=false → Nominatim couldn't find the address at all.
        if (data.located === false) setNotLocated(true);
        else setNotCovered(true);
        return;
      }
      setZoneName(data.zoneName);
      setShippingCost(Number(data.shippingCost ?? 0));
      setFreeShippingFrom(Number(data.freeShippingFrom ?? 0));
      setOptions({
        enabledWeekdays: data.enabledWeekdays,
        slots: data.slots,
      });
    } catch {
      setZoneError("Hubo un problema de conexión. Probá de nuevo.");
    } finally {
      setCheckingZone(false);
    }
  }

  async function handleSubmit() {
    setError(null);

    // Friendly client-side checks (the server validates again).
    if (!name.trim()) return setError("Ingresá tu nombre.");
    if (!phone.trim()) return setError("Ingresá tu teléfono.");
    if (deliveryType === "DELIVERY") {
      if (!street.trim()) return setError("Ingresá la calle y número.");
      if (!locality.trim()) return setError("Ingresá la localidad.");
      if (notCovered || notLocated)
        return setError("Lo sentimos, por ahora no llegamos a tu dirección.");
      if (!covered)
        return setError("Verificá tu dirección (paso 2) antes de seguir.");
    }
    if (!dateIso) return setError("Elegí un día de entrega.");
    if (!slot) return setError("Elegí un horario.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          notes: notes || undefined,
          deliveryType,
          street: deliveryType === "DELIVERY" ? street : undefined,
          locality: deliveryType === "DELIVERY" ? locality : undefined,
          postalCode:
            deliveryType === "DELIVERY"
              ? postalCode.trim() || undefined
              : undefined,
          floor:
            deliveryType === "DELIVERY" ? floor.trim() || undefined : undefined,
          scheduledDate: `${dateIso}T12:00:00`,
          scheduledSlot: slot,
          paymentMethod: "CASH",
          items: lines.map((l) => ({
            productId: l.productId,
            breadcrumbType: l.breadcrumbType,
            quantity: l.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "No pudimos guardar el pedido.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/pedido/confirmado?id=${data.id}`);
    } catch {
      setError("Hubo un problema de conexión. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  // Wait for the cart to hydrate before deciding it's empty.
  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="font-bold uppercase tracking-wide text-muted">
          Cargando…
        </p>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-4 text-center">
        <BernaLogo variant="dark" size="sm" />
        <p className="font-bold uppercase tracking-wide text-ink">
          Tu carrito está vacío.
        </p>
        <Link
          href="/#productos"
          className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white"
        >
          Ver productos
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-28">
      {/* Slim header */}
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <Link
          href="/#productos"
          className="font-bold uppercase tracking-widest text-xs text-ink"
        >
          ‹ Volver
        </Link>
        <BernaLogo variant="dark" size="sm" />
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 font-black uppercase tracking-tight text-3xl text-ink">
          Finalizá tu pedido
        </h1>

        {/* 1. Datos */}
        <Section number="1" title="Tus datos">
          <Field label="Nombre y apellido" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ej: Juana Pérez"
            />
          </Field>
          <Field label="Teléfono" required>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="Ej: 11 5049 3297"
            />
          </Field>
          <Field label="Email (opcional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="Ej: juana@email.com"
            />
          </Field>
          <Field label="Nota para el pedido (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Ej: tocar timbre 2B"
            />
          </Field>
        </Section>

        {/* 2. Entrega */}
        <Section number="2" title="Entrega">
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton
              active={deliveryType === "DELIVERY"}
              onClick={() => setDeliveryType("DELIVERY")}
            >
              Envío a domicilio
            </ChoiceButton>
            <ChoiceButton
              active={deliveryType === "PICKUP"}
              onClick={() => setDeliveryType("PICKUP")}
            >
              Retiro en local
            </ChoiceButton>
          </div>
          {deliveryType === "DELIVERY" && (
            <div className="mt-4 space-y-3">
              <Field label="Calle y número" required>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value);
                    if (covered || notCovered || notLocated || zoneError)
                      resetZone();
                  }}
                  className={inputClass}
                  placeholder="Ej: Avenida Italia 600"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Localidad" required>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => {
                      setLocality(e.target.value);
                      if (covered || notCovered || notLocated || zoneError)
                        resetZone();
                    }}
                    className={inputClass}
                    placeholder="Ej: Tigre"
                  />
                </Field>
                <Field label="Código postal (opcional)">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(e.target.value);
                      if (covered || notCovered || notLocated || zoneError)
                        resetZone();
                    }}
                    className={inputClass}
                    placeholder="Ej: 1648"
                  />
                </Field>
              </div>

              <Field label="Piso / depto / barrio (opcional)">
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Piso 3 B, o Barrio Los Robles, lote 12"
                />
              </Field>

              <button
                type="button"
                onClick={() => checkZone()}
                disabled={checkingZone || !street.trim() || !locality.trim()}
                className="w-full border border-black px-4 py-3 font-bold uppercase tracking-widest text-xs text-ink transition-colors hover:bg-black hover:text-white disabled:opacity-40"
              >
                {checkingZone ? "Verificando…" : "Verificar dirección"}
              </button>

              {zoneError && <ErrorNote>{zoneError}</ErrorNote>}

              {notLocated && (
                <p className="rounded-lg border border-black bg-white px-4 py-3 text-sm font-bold text-ink">
                  No pudimos ubicar esa dirección. Revisá que esté completa
                  (calle, número y localidad).
                </p>
              )}

              {notCovered && (
                <p className="rounded-lg border border-black bg-ink px-4 py-3 text-sm font-bold text-white">
                  Lo sentimos, por ahora no llegamos a tu dirección.
                </p>
              )}

              {covered && (
                <p className="rounded-lg border border-line bg-cream/60 px-4 py-3 text-sm font-bold text-ink">
                  ✓ Entregamos en tu dirección{zoneName ? `: zona ${zoneName}` : ""}
                </p>
              )}
            </div>
          )}
        </Section>

        {/* 3. Cuándo */}
        <Section number="3" title="¿Cuándo?">
          {!options && (
            <p className="text-sm text-muted">
              Primero verificá tu zona de entrega (paso 2) para ver los días
              disponibles.
            </p>
          )}
          {options && options.enabledWeekdays.length === 0 && (
            <p className="text-sm text-muted">
              Tu zona no tiene días de entrega configurados por el momento.
            </p>
          )}
          {options && options.enabledWeekdays.length > 0 && (
            <>
              <CheckoutCalendar
                enabledWeekdays={options.enabledWeekdays}
                selected={dateIso}
                onSelect={(iso) => {
                  setDateIso(iso);
                  setSlot(null);
                }}
              />
              {dateIso && (
                <div className="mt-4">
                  <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
                    Horario
                  </p>
                  {options.slots.length === 0 ? (
                    <p className="text-sm text-muted">
                      No hay horarios disponibles por ahora.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {options.slots.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSlot(s.label)}
                          aria-pressed={slot === s.label}
                          className={`rounded-full border border-black px-4 py-1.5 font-bold uppercase tracking-wide text-xs transition-colors ${
                            slot === s.label
                              ? "bg-black text-white"
                              : "bg-white text-black"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Section>

        {/* 4. Pago */}
        <Section number="4" title="Pago">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChoiceButton active onClick={() => {}}>
              Efectivo al recibir
            </ChoiceButton>
            <button
              type="button"
              disabled
              title="Mercado Pago llega en el Paso 4"
              className="cursor-not-allowed rounded-lg border border-line bg-white px-4 py-4 font-bold uppercase tracking-wide text-sm text-muted opacity-60"
            >
              Mercado Pago — próximamente
            </button>
          </div>
        </Section>

        {/* 5. Resumen */}
        <Section number="5" title="Resumen">
          <ul className="divide-y divide-line">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="text-sm text-ink">
                  <span className="font-bold">{line.quantity}x</span>{" "}
                  {line.name}
                  <span className="text-muted">
                    {" "}
                    ·{" "}
                    {BREADCRUMB_LABELS[line.breadcrumbType] ??
                      line.breadcrumbType}
                  </span>
                </span>
                <span className="font-bold text-ink">
                  {formatPrice(line.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Subtotal + shipping (when a delivery zone is confirmed) */}
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>Productos</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            {deliveryType === "DELIVERY" && covered && (
              <div className="flex items-center justify-between text-muted">
                <span>Envío{zoneName ? ` (${zoneName})` : ""}</span>
                <span>{shipping === 0 ? "Gratis" : formatPrice(shipping)}</span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold uppercase tracking-wide text-ink">
              Total
            </span>
            <span className="font-black text-2xl text-ink">
              {formatPrice(deliveryType === "DELIVERY" ? grandTotal : totalPrice)}
            </span>
          </div>
        </Section>

        {error && <ErrorNote>{error}</ErrorNote>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full bg-black px-4 py-4 font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80 disabled:opacity-50"
        >
          {submitting ? "Guardando…" : "Confirmar pedido"}
        </button>
      </div>
    </main>
  );
}

// --- small presentational helpers ---

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-black";

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-lg border border-line bg-white p-5">
      <h2 className="mb-4 flex items-center gap-3 font-black uppercase tracking-tight text-lg text-ink">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label} {required && <span className="text-ink">*</span>}
      </span>
      {children}
    </label>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-4 py-4 font-bold uppercase tracking-wide text-sm transition-colors ${
        active
          ? "border-black bg-black text-white"
          : "border-line bg-white text-ink hover:border-black"
      }`}
    >
      {children}
    </button>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-lg border border-black bg-white px-4 py-3 text-sm font-bold text-ink">
      {children}
    </p>
  );
}
