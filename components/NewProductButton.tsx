"use client";

import { useState } from "react";
import ProductForm, { type ProductFormValues } from "@/components/ProductForm";

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  category: "CARNE",
  weightGrams: 1000,
  isNew: false,
  available: true,
  breadcrumbs: ["TRADITIONAL"],
  prices: {},
  stocks: {},
  images: {},
};

// Toggles a blank product form to create a new product.
export default function NewProductButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
      >
        + Nuevo producto
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-5">
      <p className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
        Nuevo producto
      </p>
      <ProductForm mode="create" initial={EMPTY} onDone={() => setOpen(false)} />
    </div>
  );
}
