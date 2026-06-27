"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Acciones por fila del presupuesto: ver/imprimir, editar, duplicar, borrar.
// Ninguna toca stock/caja/ventas: solo el documento.
export default function PresupuestoActions({
  id,
  number,
}: {
  id: string;
  number: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/presupuestos/${id}/duplicate`, {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.id) {
        router.push(`/admin/operaciones/presupuestos/${d.id}/editar`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        `Eliminar el presupuesto #${String(number).padStart(6, "0")}. Esta acción no se puede deshacer. ¿Continuar?`
      )
    )
      return;
    setBusy(true);
    try {
      await fetch(`/api/admin/presupuestos/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Link
        href={`/admin/operaciones/presupuestos/${id}/imprimir`}
        className="text-[11px] font-bold uppercase tracking-widest text-ink hover:underline"
      >
        Ver / Imprimir
      </Link>
      <Link
        href={`/admin/operaciones/presupuestos/${id}/editar`}
        className="text-[11px] font-bold uppercase tracking-widest text-ink hover:underline"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={duplicate}
        disabled={busy}
        className="text-[11px] font-bold uppercase tracking-widest text-muted hover:text-ink disabled:opacity-50"
      >
        Duplicar
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="text-[11px] font-bold uppercase tracking-widest text-muted hover:text-red-600 disabled:opacity-50"
      >
        Eliminar
      </button>
    </div>
  );
}
