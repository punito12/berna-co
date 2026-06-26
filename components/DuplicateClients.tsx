"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DupClient = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  orders: number;
  sales: number;
  remitos: number;
};
type DupGroup = { normalized: string; clients: DupClient[] };

const TYPE_LABELS: Record<string, string> = {
  MINORISTA: "Minorista",
  MAYORISTA: "Mayorista",
  KIOSCO: "Kiosco",
};

// Sección "Posibles duplicados": agrupa clientes con el mismo nombre normalizado
// y permite fusionarlos en uno primario (reasigna pedidos/ventas/remitos y borra
// el registro duplicado vacío). No borra ventas/remitos/pedidos.
export default function DuplicateClients({ groups }: { groups: DupGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-muted">
        No se detectaron clientes duplicados. 🎉
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <DuplicateGroupCard key={g.normalized} group={g} />
      ))}
    </div>
  );
}

function DuplicateGroupCard({ group }: { group: DupGroup }) {
  const router = useRouter();
  // Primario por defecto: el que más historial tiene (luego el más antiguo, que
  // ya viene primero por orden de creación).
  const sorted = [...group.clients].sort(
    (a, b) =>
      b.orders + b.sales + b.remitos - (a.orders + a.sales + a.remitos)
  );
  const [primaryId, setPrimaryId] = useState(sorted[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function merge() {
    const duplicateIds = group.clients
      .map((c) => c.id)
      .filter((id) => id !== primaryId);
    if (duplicateIds.length === 0) return;
    const primary = group.clients.find((c) => c.id === primaryId);
    if (
      !confirm(
        `Fusionar ${duplicateIds.length + 1} clientes en "${primary?.name}".\n\n` +
          "Se reasignan todos los pedidos, ventas y remitos al cliente elegido y " +
          "se borran los registros duplicados (vacíos). No se borra ninguna venta " +
          "ni remito. ¿Continuar?"
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/customers/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, duplicateIds }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo fusionar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-amber-800">
        {group.clients.length} registros que parecen el mismo cliente
      </p>
      <div className="space-y-2">
        {group.clients.map((c) => (
          <label
            key={c.id}
            className="flex flex-wrap items-center gap-3 rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={`primary-${group.normalized}`}
              checked={primaryId === c.id}
              onChange={() => setPrimaryId(c.id)}
            />
            <span className="font-bold text-ink">{c.name}</span>
            <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {TYPE_LABELS[c.type] ?? c.type}
            </span>
            {c.phone && <span className="text-muted">{c.phone}</span>}
            <span className="ml-auto text-[11px] text-muted">
              {c.orders} pedidos · {c.sales} ventas · {c.remitos} remitos
            </span>
          </label>
        ))}
      </div>
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-muted">
          Primario: mantener este registro y fusionar el resto adentro.
        </span>
        <button
          type="button"
          onClick={merge}
          disabled={busy}
          className="ml-auto bg-black px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
        >
          {busy ? "Fusionando…" : "Fusionar duplicados"}
        </button>
      </div>
    </div>
  );
}
