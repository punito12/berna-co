"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProspectScoringRules } from "@/lib/prospect-types";

type Query = {
  id: string;
  label: string;
  provider: string;
  mode: string;
  value: string;
  placeTypes: string;
  categoryFamily: string;
  active: boolean;
  sortOrder: number;
};

const inputClass =
  "rounded border border-line bg-white px-2 py-2 text-sm text-ink outline-none focus:border-black";

function lines(value: string[]): string {
  return value.join("\n");
}

function parseLines(value: string): string[] {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
}

function QueryRow({ query }: { query: Query }) {
  const router = useRouter();
  const [label, setLabel] = useState(query.label);
  const [mode, setMode] = useState(query.mode);
  const [value, setValue] = useState(query.value);
  const [family, setFamily] = useState(query.categoryFamily);
  const [placeTypes, setPlaceTypes] = useState(() => {
    try {
      const parsed = JSON.parse(query.placeTypes);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/prospects/config/queries/${query.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          provider: query.provider,
          mode,
          value,
          placeTypes: parseLines(placeTypes),
          categoryFamily: family,
          active: true,
          sortOrder: query.sortOrder,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
      setMessage("Guardado");
      router.refresh();
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!window.confirm(`¿Desactivar “${query.label}”?`)) return;
    setBusy(true);
    const response = await fetch(`/api/admin/prospects/config/queries/${query.id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-2 border-b border-line py-3 lg:grid-cols-[1.2fr_0.7fr_1.2fr_1fr_1.3fr_auto]">
      <input aria-label="Nombre de consulta" value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
      <select aria-label="Modo" value={mode} onChange={(event) => setMode(event.target.value)} className={inputClass}>
        <option value="TEXT">Texto</option>
        <option value="TYPE">Tipos</option>
      </select>
      <input aria-label="Valor de búsqueda" value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} />
      <input aria-label="Familia" value={family} onChange={(event) => setFamily(event.target.value)} className={inputClass} />
      <input aria-label="Google Place types" value={placeTypes} onChange={(event) => setPlaceTypes(event.target.value)} className={inputClass} placeholder="grocery_store, market" />
      <div className="flex items-center justify-end gap-2">
        {message && <span className="max-w-[140px] text-[10px] text-muted">{message}</span>}
        <button type="button" onClick={save} disabled={busy} className="bg-black px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-white disabled:opacity-40">Guardar</button>
        <button type="button" onClick={disable} disabled={busy} className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-muted">Desactivar</button>
      </div>
    </div>
  );
}

function NewQueryForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState("TEXT");
  const [value, setValue] = useState("");
  const [family, setFamily] = useState("GENERAL");
  const [placeTypes, setPlaceTypes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    const response = await fetch("/api/admin/prospects/config/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        provider: "GOOGLE",
        mode,
        value,
        placeTypes: parseLines(placeTypes),
        categoryFamily: family,
        active: true,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return setError(result.error ?? "No se pudo crear.");
    setLabel("");
    setValue("");
    setPlaceTypes("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-cream/30 p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-ink">
        Nueva consulta
      </p>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre visible" className={inputClass} />
        <select value={mode} onChange={(event) => setMode(event.target.value)} className={inputClass}>
          <option value="TEXT">Texto</option>
          <option value="TYPE">Tipos</option>
        </select>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Término" className={inputClass} />
        <input value={family} onChange={(event) => setFamily(event.target.value)} placeholder="Familia" className={inputClass} />
        <input value={placeTypes} onChange={(event) => setPlaceTypes(event.target.value)} placeholder="Place types (si aplica)" className={inputClass} />
      </div>
      {error && <p className="mt-2 text-sm font-bold text-red-700">{error}</p>}
      <button type="button" onClick={create} className="mt-3 bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
        Agregar consulta
      </button>
    </div>
  );
}

export default function ProspectConfigurationManager({
  initialRules,
  queries,
}: {
  initialRules: ProspectScoringRules;
  queries: Query[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateTier(tier: "A" | "B" | "C" | "EXCLUDED", points: number) {
    setRules((current) => ({
      ...current,
      tierPoints: { ...current.tierPoints, [tier]: points },
    }));
  }

  async function saveRules() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/prospects/config/scoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
      setMessage("Configuración guardada. Recalculá los prospectos que quieras actualizar.");
      router.refresh();
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-black uppercase tracking-tight text-xl text-ink">
          Puntaje y reglas
        </h2>
        <p className="mt-1 text-sm text-muted">
          El cálculo es determinístico. Ninguna regla estima ventas, margen,
          capacidad de freezer ni proveedores actuales.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["A", "B", "C", "EXCLUDED"] as const).map((tier) => (
            <label key={tier}>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
                Tier {tier}
              </span>
              <input
                type="number"
                min={0}
                max={55}
                value={rules.tierPoints[tier]}
                onChange={(event) => updateTier(tier, Number(event.target.value))}
                className={`${inputClass} w-full`}
              />
            </label>
          ))}
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Alta prioridad desde
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={rules.highPriorityFrom}
              onChange={(event) =>
                setRules((current) => ({
                  ...current,
                  highPriorityFrom: Number(event.target.value),
                }))
              }
              className={`${inputClass} w-full`}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Palabras de posicionamiento premium
            </span>
            <textarea
              rows={7}
              value={lines(rules.premiumKeywords)}
              onChange={(event) =>
                setRules((current) => ({
                  ...current,
                  premiumKeywords: parseLines(event.target.value),
                }))
              }
              className={`${inputClass} w-full font-mono text-xs`}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Exclusiones determinísticas
            </span>
            <textarea
              rows={7}
              value={lines(rules.excludedKeywords)}
              onChange={(event) =>
                setRules((current) => ({
                  ...current,
                  excludedKeywords: parseLines(event.target.value),
                }))
              }
              className={`${inputClass} w-full font-mono text-xs`}
            />
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-ink">
            Categorías de compatibilidad
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[850px] space-y-2">
              {rules.compatibility.map((category, index) => (
                <div key={category.key} className="grid grid-cols-[0.8fr_1.3fr_90px_1.8fr_1.8fr] gap-2 rounded border border-line p-2">
                  <input value={category.key} readOnly className={`${inputClass} bg-cream/40 font-mono text-xs`} />
                  <input
                    value={category.label}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        compatibility: current.compatibility.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, label: event.target.value } : row
                        ),
                      }))
                    }
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={category.score}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        compatibility: current.compatibility.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, score: Number(event.target.value) } : row
                        ),
                      }))
                    }
                    className={inputClass}
                  />
                  <input
                    value={category.keywords.join(", ")}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        compatibility: current.compatibility.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, keywords: parseLines(event.target.value) } : row
                        ),
                      }))
                    }
                    placeholder="Palabras"
                    className={inputClass}
                  />
                  <input
                    value={category.placeTypes.join(", ")}
                    onChange={(event) =>
                      setRules((current) => ({
                        ...current,
                        compatibility: current.compatibility.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, placeTypes: parseLines(event.target.value) } : row
                        ),
                      }))
                    }
                    placeholder="Google Place types"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Puntos por palabra premium
            </span>
            <input type="number" value={rules.premiumPointsPerKeyword} onChange={(event) => setRules((current) => ({ ...current, premiumPointsPerKeyword: Number(event.target.value) }))} className={`${inputClass} w-full`} />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
              Máximo premium
            </span>
            <input type="number" value={rules.premiumKeywordMax} onChange={(event) => setRules((current) => ({ ...current, premiumKeywordMax: Number(event.target.value) }))} className={`${inputClass} w-full`} />
          </label>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-cream/30 p-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-ink">
            Uso mensual asumido de Google Places
          </h3>
          <p className="mt-1 text-xs text-muted">
            Cargá cuántos requests ya consumió el proyecto este mes. El
            estimador descuenta el free tier restante de cada SKU; los precios
            y field masks no se editan manualmente.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["TEXT_SEARCH_IDS_ONLY", "Text Search IDs-only"],
                ["PLACE_DETAILS_PRO", "Place Details Pro"],
                ["PLACE_DETAILS_ENTERPRISE", "Place Details Enterprise"],
              ] as const
            ).map(([sku, label]) => (
              <label key={sku}>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted">
                  {label}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={rules.googlePlacesMonthlyUsage[sku]}
                  onChange={(event) =>
                    setRules((current) => ({
                      ...current,
                      googlePlacesMonthlyUsage: {
                        ...current.googlePlacesMonthlyUsage,
                        [sku]: Math.max(0, Number(event.target.value)),
                      },
                    }))
                  }
                  className={`${inputClass} w-full`}
                />
              </label>
            ))}
          </div>
        </div>
        {message && <p className="mt-3 text-sm font-bold text-ink">{message}</p>}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={saveRules} disabled={busy} className="bg-black px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-40">
            {busy ? "Guardando…" : "Guardar scoring"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-black uppercase tracking-tight text-xl text-ink">
          Catálogo de búsquedas
        </h2>
        <p className="mt-1 text-sm text-muted">
          Todas las consultas de discovery usan Text Search IDs-only. Los modos
          y tipos se conservan para construir la búsqueda, pero Nearby Search
          no se usa porque incluso pedir solo el ID dispara su SKU Pro.
        </p>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[950px]">
            {queries.map((query) => (
              <QueryRow key={query.id} query={query} />
            ))}
          </div>
        </div>
        <div className="mt-4">
          <NewQueryForm />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-black uppercase tracking-tight text-xl text-amber-950">
          Green Life: proveedor complementario en espera
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-amber-900">
          El adaptador está aislado detrás de la interfaz de proveedores, pero
          el sitio actual no publica un feed geográfico estable: las páginas
          mezclan comercios y actividades incompatibles, y no exponen
          coordenadas estructuradas. No se habilita scraping HTML frágil. Puede
          activarse cuando exista un feed autorizado con nombre, categoría,
          dirección, coordenadas y URL de origen.
        </p>
      </section>
    </div>
  );
}
