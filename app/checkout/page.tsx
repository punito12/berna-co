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
  const {
    lines,
    subtotal,
    promoDiscount,
    totalPrice,
    totalUnits,
    hydrated,
    clearCart,
    reprice,
  } = useCart();

  // Active volume-discount tiers (loaded once), for the kg discount + message.
  const [kgTiers, setKgTiers] = useState<
    { minKg: number; discountPercent: number }[]
  >([]);
  useEffect(() => {
    fetch("/api/quantity-discounts")
      .then((r) => r.json())
      .then((d) => setKgTiers(d.tiers ?? []))
      .catch(() => setKgTiers([]));
  }, []);

  // On entering checkout, refresh prices/promos against the live products so
  // the shown amount always matches what the server will charge.
  useEffect(() => {
    if (hydrated) reprice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Editable checkout texts from the CMS (published). Fallbacks below if missing.
  const [cms, setCms] = useState<Record<string, string>>({});
  useEffect(() => {
    const params = new URLSearchParams({ category: "checkout" });
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (preview) params.set("preview", preview);
    fetch(`/api/cms/texts?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setCms(d.texts ?? {}))
      .catch(() => setCms({}));
  }, []);
  const ct = (key: string, fb: string) => cms[key] || fb;

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
  const [paymentMethod, setPaymentMethod] = useState<
    "EFECTIVO" | "TRANSFERENCIA" | "MERCADOPAGO"
  >("EFECTIVO");

  // Payment-method config (discounts + transfer data), loaded once.
  const [payCfg, setPayCfg] = useState<{
    efectivoDiscountPercent: number;
    transferenciaDiscountPercent: number;
    aliasMercadoPago: string;
    cbu: string;
    whatsappNumber: string;
  } | null>(null);
  useEffect(() => {
    fetch("/api/payment-config")
      .then((r) => r.json())
      .then((d) => setPayCfg(d.config ?? null))
      .catch(() => setPayCfg(null));
  }, []);

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

  // --- discount code state ---
  const [code, setCode] = useState("");
  const [codeApplied, setCodeApplied] = useState<{
    code: string;
    amount: number;
    label: string;
  } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // --- submission state ---
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const covered = Boolean(options);

  // Volume discount: highest active tier the cart's unit total reaches (each
  // unit counts as 1).
  const kgPercent = kgTiers.reduce(
    (best, t) =>
      totalUnits >= t.minKg && t.discountPercent > best
        ? t.discountPercent
        : best,
    0
  );
  const kgDiscount = kgPercent > 0 ? Math.round((totalPrice * kgPercent) / 100) : 0;
  const afterKg = Math.max(0, totalPrice - kgDiscount);
  // Next tier to aim for (motivational message).
  const nextTier = [...kgTiers]
    .sort((a, b) => a.minKg - b.minKg)
    .find((t) => t.minKg > totalUnits && t.discountPercent > kgPercent);

  // Code discount (validated against the post-kg subtotal).
  const codeDiscount = codeApplied?.amount ?? 0;
  const afterCode = Math.max(0, afterKg - codeDiscount);

  // Payment-method discount (efectivo / transferencia), on the post-code
  // subtotal. MP carries no discount.
  const methodPercent =
    payCfg && paymentMethod === "EFECTIVO"
      ? payCfg.efectivoDiscountPercent
      : payCfg && paymentMethod === "TRANSFERENCIA"
      ? payCfg.transferenciaDiscountPercent
      : 0;
  const methodDiscount =
    methodPercent > 0 ? Math.round((afterCode * methodPercent) / 100) : 0;
  const afterDiscounts = Math.max(0, afterCode - methodDiscount);

  // Delivery fee: free when the zone has a threshold and the (discounted) total
  // reaches it.
  const shipping =
    freeShippingFrom > 0 && afterDiscounts >= freeShippingFrom
      ? 0
      : shippingCost;
  const grandTotal = afterDiscounts + shipping;

  async function applyCode() {
    setCodeError(null);
    if (!code.trim()) return;
    setCheckingCode(true);
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: afterKg }),
      });
      const data = await res.json();
      if (data.ok) {
        setCodeApplied({ code: data.code, amount: data.amount, label: data.label });
      } else {
        setCodeApplied(null);
        setCodeError(data.error ?? "Código inválido.");
      }
    } catch {
      setCodeError("No pudimos validar el código. Probá de nuevo.");
    } finally {
      setCheckingCode(false);
    }
  }

  function clearCode() {
    setCode("");
    setCodeApplied(null);
    setCodeError(null);
  }

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
          paymentMethod,
          discountCode: codeApplied?.code || undefined,
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
      // Mercado Pago: redirect to the hosted checkout.
      if (paymentMethod === "MERCADOPAGO" && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      // Transferencia: show the transfer instructions + WhatsApp screen.
      if (paymentMethod === "TRANSFERENCIA") {
        router.push(`/pedido/transferencia?id=${data.id}`);
        return;
      }
      // Efectivo: confirmation.
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
      {/* Volume-discount strip */}
      {kgTiers.length > 0 && (
        <div className="bg-black px-4 py-2 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-white">
            🎉 Descuento por cantidad:{" "}
            {[...kgTiers]
              .sort((a, b) => a.minKg - b.minKg)
              .map((t) => `${t.minKg}+ unidades ${t.discountPercent}% OFF`)
              .join(" · ")}
          </p>
        </div>
      )}
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
        <Section number="1" title={ct("checkout.step.contact", "Tus datos")}>
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
              placeholder="Ej: 11 2345 6789"
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
        <Section number="2" title={ct("checkout.step.delivery", "Entrega")}>
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
        <Section number="3" title={ct("checkout.step.schedule", "¿Cuándo?")}>
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
        <Section number="4" title={ct("checkout.step.payment", "Pago")}>
          <div className="grid grid-cols-1 gap-3">
            <PaymentCard
              active={paymentMethod === "EFECTIVO"}
              onClick={() => setPaymentMethod("EFECTIVO")}
              title="Efectivo al recibir"
              subtitle="Pagás cuando te llega el pedido"
              badge={
                payCfg && payCfg.efectivoDiscountPercent > 0
                  ? `${payCfg.efectivoDiscountPercent}% OFF`
                  : undefined
              }
            />
            <PaymentCard
              active={paymentMethod === "TRANSFERENCIA"}
              onClick={() => setPaymentMethod("TRANSFERENCIA")}
              title="Transferencia bancaria"
              subtitle="Transferís y enviás el comprobante por WhatsApp"
              badge={
                payCfg && payCfg.transferenciaDiscountPercent > 0
                  ? `${payCfg.transferenciaDiscountPercent}% OFF`
                  : undefined
              }
            />
            <PaymentCard
              active={paymentMethod === "MERCADOPAGO"}
              onClick={() => setPaymentMethod("MERCADOPAGO")}
              title="Tarjeta (Mercado Pago)"
              subtitle="Crédito o débito a través de Mercado Pago"
            />
          </div>
          {paymentMethod === "MERCADOPAGO" && (
            <p className="mt-3 text-sm text-muted">
              Al confirmar te llevamos a Mercado Pago para completar el pago.
            </p>
          )}
          {paymentMethod === "TRANSFERENCIA" && (
            <p className="mt-3 text-sm text-muted">
              Al confirmar te mostramos los datos para transferir y mandar el
              comprobante por WhatsApp.
            </p>
          )}
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

          {/* Discount code */}
          <div className="mt-4 border-t border-line pt-4">
            {codeApplied ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-cream/40 px-3 py-2">
                <span className="text-sm font-bold text-ink">
                  Código {codeApplied.code} · {codeApplied.label}
                </span>
                <button
                  type="button"
                  onClick={clearCode}
                  className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-1 font-bold uppercase tracking-wide text-[11px] text-muted">
                  ¿Tenés un código de descuento?
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCode();
                      }
                    }}
                    className={inputClass}
                    placeholder="Ej: BERNA10"
                  />
                  <button
                    type="button"
                    onClick={applyCode}
                    disabled={checkingCode || !code.trim()}
                    className="shrink-0 border border-black px-4 font-bold uppercase tracking-widest text-xs text-ink transition-colors hover:bg-black hover:text-white disabled:opacity-40"
                  >
                    {checkingCode ? "…" : "Aplicar"}
                  </button>
                </div>
                {codeError && (
                  <p className="mt-1 text-sm font-bold text-ink">{codeError}</p>
                )}
              </div>
            )}
          </div>

          {/* Volume discount motivational message */}
          {(kgPercent > 0 || nextTier) && totalUnits > 0 && (
            <div className="mt-4 rounded-lg border border-black bg-cream/60 px-4 py-3 text-sm">
              {kgPercent > 0 && (
                <p className="font-bold text-ink">
                  🎉 Comprando {totalUnits} unidades accedés a {kgPercent}% off.
                </p>
              )}
              {nextTier && (
                <p className={kgPercent > 0 ? "mt-1 text-muted" : "text-ink"}>
                  Te faltan{" "}
                  <span className="font-bold text-ink">
                    {Math.ceil(nextTier.minKg - totalUnits)} unidad
                    {Math.ceil(nextTier.minKg - totalUnits) === 1 ? "" : "es"}
                  </span>{" "}
                  para llegar a {nextTier.discountPercent}% off.
                </p>
              )}
            </div>
          )}

          {/* Totals breakdown */}
          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex items-center justify-between text-muted">
                <span>Promos (2x1 / 3x2)</span>
                <span>− {formatPrice(promoDiscount)}</span>
              </div>
            )}
            {kgDiscount > 0 && (
              <div className="flex items-center justify-between text-muted">
                <span>Descuento por cantidad ({kgPercent}%)</span>
                <span>− {formatPrice(kgDiscount)}</span>
              </div>
            )}
            {codeApplied && (
              <div className="flex items-center justify-between text-muted">
                <span>Código {codeApplied.code}</span>
                <span>− {formatPrice(codeDiscount)}</span>
              </div>
            )}
            {methodDiscount > 0 && (
              <div className="flex items-center justify-between text-muted">
                <span>
                  {paymentMethod === "EFECTIVO" ? "Efectivo" : "Transferencia"} (
                  {methodPercent}%)
                </span>
                <span>− {formatPrice(methodDiscount)}</span>
              </div>
            )}
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
              {formatPrice(
                deliveryType === "DELIVERY" ? grandTotal : afterDiscounts
              )}
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
          {submitting
            ? "Procesando…"
            : paymentMethod === "MERCADOPAGO"
            ? ct("checkout.cta.pay", "Ir a pagar")
            : ct("checkout.cta.confirm", "Confirmar pedido")}
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

function PaymentCard({
  active,
  onClick,
  title,
  subtitle,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-4 text-left transition-colors ${
        active
          ? "border-black bg-black text-white"
          : "border-line bg-white text-ink hover:border-black"
      }`}
    >
      <span className="min-w-0">
        <span className="block font-bold uppercase tracking-wide text-sm">
          {title}
        </span>
        <span
          className={`mt-0.5 block text-xs ${
            active ? "text-white/70" : "text-muted"
          }`}
        >
          {subtitle}
        </span>
      </span>
      {badge && (
        <span
          className={`shrink-0 rounded-full px-3 py-1 font-black uppercase tracking-wide text-xs ${
            active ? "bg-white text-black" : "bg-green-100 text-green-700"
          }`}
        >
          {badge}
        </span>
      )}
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
