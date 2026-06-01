"use client";

import { useState } from "react";
import CustomerForm, { type CustomerValues } from "@/components/CustomerForm";

const EMPTY: CustomerValues = {
  name: "",
  type: "MINORISTA",
  defaultDiscount: 10,
  phone: "",
  notes: "",
};

export default function NewCustomerButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
      >
        + Nuevo cliente
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-5">
      <p className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
        Nuevo cliente
      </p>
      <CustomerForm mode="create" initial={EMPTY} onDone={() => setOpen(false)} />
    </div>
  );
}
