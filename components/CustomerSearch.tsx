"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerForm, { type BarrioOption } from "@/components/CustomerForm";
import { CUSTOMER_TYPE_LABELS } from "@/lib/management";

type Result = {
  id: string;
  name: string;
  type: string;
  barrio: string | null;
  phone: string | null;
  orders: number;
};

// Searchable customer list: type a name or barrio to filter. Each result links
// to the customer's file. Includes a "new customer" form.
export default function CustomerSearch({
  initial,
  barrios,
}: {
  initial: Result[];
  barrios: BarrioOption[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>(initial);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(q)}`
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Buscar por nombre o barrio…"
          className="flex-1 min-w-[220px] rounded border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
        >
          {creating ? "Cerrar" : "+ Nuevo cliente"}
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-dashed border-line bg-white p-5">
          <p className="mb-4 font-black uppercase tracking-tight text-lg text-ink">
            Nuevo cliente
          </p>
          <CustomerForm
            mode="create"
            barrios={barrios}
            initial={{
              name: "",
              type: "MINORISTA",
              defaultDiscount: 10,
              phone: "",
              notes: "",
              barrioId: "",
              lot: "",
            }}
            onDone={() => setCreating(false)}
          />
        </div>
      )}

      {loading && <p className="text-sm text-muted">Buscando…</p>}

      {!loading && results.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          {query.trim() ? "Sin resultados." : "Todavía no hay clientes."}
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clientes/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 transition-colors hover:border-black"
            >
              <div>
                <p className="font-bold uppercase tracking-tight text-ink">
                  {c.name}
                  <span className="ml-2 rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {CUSTOMER_TYPE_LABELS[c.type] ?? c.type}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.barrio ? c.barrio : "Sin barrio"}
                  {c.phone ? ` · ${c.phone}` : ""}
                </p>
              </div>
              <span className="font-bold uppercase tracking-widest text-[11px] text-muted">
                {c.orders} pedido{c.orders === 1 ? "" : "s"} ›
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
