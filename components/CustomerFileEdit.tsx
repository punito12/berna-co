"use client";

import { useState } from "react";

// Collapsible wrapper to show/hide the customer edit form on the file page.
export default function CustomerFileEdit({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs text-ink hover:bg-black hover:text-white"
      >
        {open ? "Cerrar edición" : "Editar datos / asignar barrio"}
      </button>
      {open && <div className="mt-5 border-t border-line pt-5">{children}</div>}
    </div>
  );
}
