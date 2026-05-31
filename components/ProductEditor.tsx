"use client";

import { useState } from "react";
import ProductForm, { type ProductFormValues } from "@/components/ProductForm";
import { BREADCRUMB_LABELS, formatPrice } from "@/lib/products";

// A product row: a compact summary that expands into the full edit form.
export default function ProductEditor({
  product,
}: {
  product: ProductFormValues;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold uppercase tracking-tight text-ink">
            {product.name}
            {!product.available && (
              <span className="ml-2 rounded bg-muted px-2 py-0.5 text-[10px] text-white">
                Inactivo
              </span>
            )}
            {product.isNew && (
              <span className="ml-2 rounded bg-ink px-2 py-0.5 text-[10px] text-white">
                New
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {product.breadcrumbs
              .map(
                (b) =>
                  `${BREADCRUMB_LABELS[b] ?? b} ${formatPrice(
                    product.prices[b] ?? 0
                  )}`
              )
              .join(" · ") || "Sin empanados"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
        >
          {open ? "Cerrar" : "Editar"}
        </button>
      </div>

      {open && (
        <div className="mt-5 border-t border-line pt-5">
          <ProductForm
            mode="edit"
            initial={product}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
