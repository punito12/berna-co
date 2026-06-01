"use client";

import { useState } from "react";
import CustomerForm, { type CustomerValues } from "@/components/CustomerForm";
import { CUSTOMER_TYPE_LABELS } from "@/lib/management";

// A customer row that expands into the edit form.
export default function CustomerRow({ customer }: { customer: CustomerValues }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold uppercase tracking-tight text-ink">
            {customer.name}
            <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {CUSTOMER_TYPE_LABELS[customer.type] ?? customer.type}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Descuento {customer.defaultDiscount}%
            {customer.phone ? ` · ${customer.phone}` : ""}
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
          <CustomerForm
            mode="edit"
            initial={customer}
            onDone={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
