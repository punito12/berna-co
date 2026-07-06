"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";

// Carrito flotante (desktop Y mobile). Patrón CRAV: un FAB en la esquina con
// el contador; al abrirlo se blurrea toda la página y aparece el panel del
// carrito en la esquina, con las líneas y el CTA al checkout. Labels
// hardcodeados (el CMS del carrito se va a rehacer).
export default function CartOverlay() {
  const { lines, totalItems, totalPrice, changeQuantity } = useCart();
  const [open, setOpen] = useState(false);

  // Tramos de descuento por cantidad (mismo endpoint que usa el checkout).
  // Con esto el panel celebra el % ganado o empuja a llegar al próximo tramo.
  const [tiers, setTiers] = useState<
    { minKg: number; discountPercent: number }[]
  >([]);
  useEffect(() => {
    fetch("/api/quantity-discounts")
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers ?? []))
      .catch(() => setTiers([]));
  }, []);

  // Mejor tramo alcanzado con las unidades actuales + el próximo alcanzable.
  const achievedPct = tiers.reduce(
    (best, t) =>
      totalItems >= t.minKg && t.discountPercent > best
        ? t.discountPercent
        : best,
    0
  );
  const nextTier = [...tiers]
    .sort((a, b) => a.minKg - b.minKg)
    .find((t) => t.minKg > totalItems && t.discountPercent > achievedPct);
  const missingUnits = nextTier ? nextTier.minKg - totalItems : 0;

  // Cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Otros componentes (el botón "Carrito" del header) pueden abrir el panel
  // disparando este evento — sin acoplar estado entre componentes.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("berna:cart-open", onOpen);
    return () => window.removeEventListener("berna:cart-open", onOpen);
  }, []);

  return (
    <div>
      {/* Backdrop: blurrea toda la página. Click afuera cierra. */}
      {open && (
        <div
          className="animate-backdrop fixed inset-0 z-40 bg-black/15 backdrop-blur-md"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel del carrito, esquina inferior derecha, arriba del FAB. */}
      {open && (
        <div
          role="dialog"
          aria-label="Carrito"
          className="animate-cart-pop fixed bottom-20 right-5 z-50 flex max-h-[24rem] w-[calc(100vw-2.5rem)] max-w-[27rem] flex-col overflow-hidden rounded-3xl bg-ink text-white shadow-[0_35px_90px_rgba(10,10,10,0.45)] sm:bottom-24 sm:max-h-[28rem]"
        >
          {totalItems === 0 ? (
            /* Estado vacío: puede abrirse desde el header sin items. */
            <div className="px-5 py-6 text-center">
              <p className="font-black uppercase tracking-[0.18em] text-xs">
                Tu carrito está vacío
              </p>
              <p className="mt-2 font-serif italic text-base text-cream/70">
                Llenalo de milanesas.
              </p>
              <a
                href="#productos"
                onClick={() => setOpen(false)}
                className="mt-4 block w-full rounded-xl bg-cream px-5 py-3 text-center font-black uppercase tracking-[0.16em] text-xs text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
              >
                Ver productos
              </a>
            </div>
          ) : (
            <>
          <div className="flex items-baseline justify-between px-4 pt-4">
            <p className="font-black uppercase tracking-[0.18em] text-xs">
              Tu carrito{" "}
              <span className="text-cream/60">{totalItems}</span>
            </p>
            <p className="font-black uppercase tracking-[0.12em] text-xs">
              Total:{" "}
              <span className="tabular-nums">{formatPrice(totalPrice)}</span>
            </p>
          </div>
          <p className="px-4 pt-0.5 font-serif italic text-sm text-cream/70">
            Listas para tu freezer.
          </p>

          {/* Descuento por cantidad: celebra el % ganado o empuja al próximo
              tramo con una barra de progreso. */}
          {achievedPct > 0 ? (
            <div className="mx-4 mt-3 rounded-xl bg-cream px-3.5 py-2.5 text-ink">
              <p className="font-black uppercase tracking-wide text-xs">
                ¡Felicitaciones! Tenés {achievedPct}% OFF
              </p>
              <p className="mt-0.5 text-xs text-ink/70">
                {nextTier
                  ? `Sumá ${missingUnits} más y pasás al ${nextTier.discountPercent}% OFF.`
                  : "Se aplica al total en el checkout."}
              </p>
            </div>
          ) : nextTier ? (
            <div className="mx-4 mt-3 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5">
              <p className="font-black uppercase tracking-wide text-xs">
                Te {missingUnits === 1 ? "falta" : "faltan"} {missingUnits}{" "}
                para el {nextTier.discountPercent}% OFF
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-cream transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((totalItems / nextTier.minKg) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Líneas (scrollea si hay muchas) */}
          <ul className="mt-3 flex-1 space-y-2 overflow-y-auto px-4 pb-1">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-black uppercase tracking-tight text-sm">
                    {line.name}
                  </p>
                  <p className="mt-0.5 text-xs text-cream/70">
                    {formatPrice(line.price)} · x{line.quantity} ·{" "}
                    {BREADCRUMB_LABELS[line.breadcrumbType] ??
                      line.breadcrumbType}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.key, -1)}
                    aria-label="Quitar uno"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-base transition-colors hover:bg-white hover:text-ink"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.key, 1)}
                    disabled={
                      typeof line.maxStock === "number" &&
                      line.quantity >= line.maxStock
                    }
                    aria-label="Agregar uno"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-base transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => changeQuantity(line.key, -line.quantity)}
                    aria-label={`Sacar ${line.name} del carrito`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 transition-colors hover:bg-white hover:text-ink"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 pb-4 pt-3">
            <Link
              href="/checkout"
              className="block w-full rounded-xl bg-cream px-5 py-3 text-center font-black uppercase tracking-[0.16em] text-xs text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
            >
              Finalizar pedido
            </Link>
          </div>
            </>
          )}
        </div>
      )}

      {/* FAB del carrito: la esquina inferior derecha es suya (WhatsApp se
          corre a la izquierda en desktop). Solo aparece con items. */}
      {totalItems > 0 && (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar carrito" : "Abrir carrito"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-[0_18px_45px_rgba(10,10,10,0.35)] transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-6 sm:w-6"
        >
          <circle cx="9" cy="21" r="1.5" />
          <circle cx="19" cy="21" r="1.5" />
          <path d="M2.5 3h2l2.6 12.5a2 2 0 0 0 2 1.5h8.7a2 2 0 0 0 2-1.6L21.5 7H6" />
        </svg>
        <span
          key={totalItems}
          className="animate-counter-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 font-black text-[10px] text-ink shadow sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-xs"
        >
          {totalItems}
        </span>
      </button>
      )}
    </div>
  );
}
