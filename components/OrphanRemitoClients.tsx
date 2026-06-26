"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Orphan = { normalized: string; displayName: string; remitos: number };

// Sección "Remitos sin cliente registrado": nombres que solo existen como texto
// en remitos viejos (sin Customer en el registro). Cada uno se puede registrar
// como cliente (mayorista por defecto) y vincular sus remitos de una.
export default function OrphanRemitoClients({ orphans }: { orphans: Orphan[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (orphans.length === 0) return null;

  async function register(displayName: string, type: string) {
    setBusy(displayName);
    setErr(null);
    try {
      const res = await fetch("/api/admin/customers/register-orphans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, type }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "No se pudo registrar.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {err && <p className="text-xs font-bold text-red-600">{err}</p>}
      {orphans.map((o) => (
        <div
          key={o.normalized}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <span className="font-bold text-ink">{o.displayName}</span>
          <span className="text-[11px] text-muted">
            {o.remitos} remito{o.remitos === 1 ? "" : "s"} sin cliente
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => register(o.displayName, "MAYORISTA")}
              disabled={busy === o.displayName}
              className="bg-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {busy === o.displayName ? "Registrando…" : "Crear mayorista y vincular"}
            </button>
            <button
              type="button"
              onClick={() => register(o.displayName, "MINORISTA")}
              disabled={busy === o.displayName}
              className="border border-line px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black disabled:opacity-50"
            >
              Minorista
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
