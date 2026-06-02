"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Barrio = { id: string; name: string; customers: number };

// Create barrios and list them; each links to its detail page.
export default function BarrioManager({ barrios }: { barrios: Barrio[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return setError("Poné un nombre.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/barrios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear.");
      setName("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, barrioName: string) {
    if (!confirm(`¿Eliminar "${barrioName}"? Los clientes quedan sin barrio.`))
      return;
    const res = await fetch(`/api/admin/barrios/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      {/* Create */}
      <div className="mb-6 rounded-lg border border-dashed border-line bg-white p-4">
        <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          Nuevo barrio
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
            className="flex-1 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
            placeholder="Ej: Nordelta"
          />
          <button
            type="button"
            onClick={create}
            disabled={saving}
            className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
          >
            {saving ? "…" : "Crear"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-bold text-ink">{error}</p>}
      </div>

      {/* List */}
      {barrios.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay barrios.
        </p>
      ) : (
        <div className="space-y-2">
          {barrios.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3"
            >
              <Link
                href={`/admin/barrios/${b.id}`}
                className="font-bold uppercase tracking-tight text-ink hover:text-muted"
              >
                {b.name}
                <span className="ml-2 font-bold uppercase tracking-wide text-[11px] text-muted">
                  {b.customers} cliente{b.customers === 1 ? "" : "s"} ›
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(b.id, b.name)}
                className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
