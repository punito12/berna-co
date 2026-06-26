"use client";

import { useEffect, useRef, useState } from "react";

export type ClientHit = {
  id: string;
  name: string;
  type: string;
  barrio?: string | null;
  phone?: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  MINORISTA: "Minorista",
  MAYORISTA: "Mayorista",
  KIOSCO: "Kiosco",
};

const inputClass =
  "w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black";

// Selector de cliente del registro central. Busca contra
// /api/admin/customers/search (acento/caso/espacio-insensible). Al elegir uno,
// fija customerId + nombre canónico. Si se escribe un nombre nuevo, queda como
// texto libre y el server lo resuelve por el registro deduplicado al guardar
// (reusa el existente o crea uno nuevo sin duplicar). Muestra un aviso cuando
// hay clientes similares al texto tipeado.
export default function ClientSelect({
  name,
  customerId,
  onChange,
  placeholder = "Cliente / razón social",
}: {
  name: string;
  customerId: string | null;
  onChange: (next: { name: string; customerId: string | null }) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(name);
  const [results, setResults] = useState<ClientHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Mantener el texto sincronizado si el padre cambia el nombre (ej. al editar).
  useEffect(() => {
    setQuery(name);
  }, [name]);

  // Búsqueda debounced mientras se escribe (y no hay cliente fijado).
  useEffect(() => {
    const q = query.trim();
    if (customerId) return; // ya hay uno elegido
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/customers/search?q=${encodeURIComponent(q)}`
        );
        const data = res.ok ? await res.json() : [];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, customerId]);

  // Cerrar el dropdown al clickear afuera.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(hit: ClientHit) {
    onChange({ name: hit.name, customerId: hit.id });
    setQuery(hit.name);
    setOpen(false);
  }

  function clearPick() {
    onChange({ name: query, customerId: null });
  }

  function handleType(value: string) {
    setQuery(value);
    setOpen(true);
    // Al editar el texto, dejamos de tener un cliente fijado (pasa a texto libre).
    onChange({ name: value, customerId: null });
  }

  const showDropdown = open && !customerId && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(true)}
        className={inputClass}
        placeholder={placeholder}
        autoComplete="off"
      />

      {customerId && (
        <p className="mt-1 flex items-center gap-2 text-[11px] text-green-700">
          <span className="font-bold">Cliente registrado seleccionado.</span>
          <button
            type="button"
            onClick={clearPick}
            className="font-bold uppercase tracking-wide text-muted underline hover:text-ink"
          >
            Cambiar
          </button>
        </p>
      )}

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lg">
          {loading && (
            <p className="px-3 py-2 text-[11px] text-muted">Buscando…</p>
          )}
          {!loading && results.length > 0 && (
            <>
              <p className="border-b border-line bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Clientes similares — usá uno existente para no duplicar
              </p>
              <ul className="max-h-60 overflow-y-auto">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream"
                    >
                      <span className="font-bold text-ink">{c.name}</span>
                      <span className="rounded bg-cream px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                      {c.barrio && (
                        <span className="text-[11px] text-muted">{c.barrio}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-muted">
              Sin coincidencias. Se creará/usará “{query.trim()}” como cliente al
              guardar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
