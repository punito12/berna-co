"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CmsTextField from "@/components/CmsTextField";

type Section = {
  key: string;
  type: string;
  visibleDraft: boolean;
  orderDraft: number;
};
type TextRow = {
  key: string;
  value: string;
  valueDraft: string;
  maxLength: number;
};

// Friendly names + which text keys each section exposes.
const SECTION_META: Record<string, { name: string; textKeys: string[] }> = {
  "home.hero": {
    name: "Hero",
    textKeys: ["home.hero.title", "home.hero.subtitle", "home.hero.cta"],
  },
  "home.ingredients": {
    name: "Ingredientes",
    textKeys: [
      "home.ingredients.eyebrow",
      "home.ingredients.title",
      "home.ingredients.item1",
      "home.ingredients.item2",
      "home.ingredients.item3",
    ],
  },
  "home.products": {
    name: "Productos",
    textKeys: ["catalogo.eyebrow", "catalogo.title", "catalogo.subtitle"],
  },
  "home.pos": {
    name: "Puntos de venta",
    textKeys: ["home.pos.eyebrow", "home.pos.title", "home.pos.subtitle"],
  },
  "home.footer": { name: "Footer", textKeys: [] },
};

export default function HomeSectionsManager({
  initialSections,
  texts,
}: {
  initialSections: Section[];
  texts: TextRow[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const textByKey = new Map(texts.map((t) => [t.key, t]));

  async function persistOrder(next: Section[]) {
    setSections(next);
    await fetch("/api/admin/cms/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "home", keys: next.map((s) => s.key) }),
    });
    router.refresh();
  }

  function onDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const from = sections.findIndex((s) => s.key === dragKey);
    const to = sections.findIndex((s) => s.key === targetKey);
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragKey(null);
    persistOrder(next);
  }

  async function toggleVisible(key: string, visible: boolean) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visibleDraft: visible } : s))
    );
    await fetch("/api/admin/cms/sections/visible", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, visible }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-sm text-muted">
        Arrastrá para reordenar. Tocá el ojo para ocultar/mostrar una sección.
        “Editar” abre los textos de esa sección.
      </p>
      {sections.map((s) => {
        const meta = SECTION_META[s.key] ?? { name: s.key, textKeys: [] };
        const open = editing === s.key;
        return (
          <div
            key={s.key}
            draggable
            onDragStart={() => setDragKey(s.key)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(s.key)}
            className={`rounded-lg border bg-white ${
              dragKey === s.key ? "border-black opacity-60" : "border-line"
            } ${!s.visibleDraft ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="cursor-grab select-none text-muted"
                  title="Arrastrar"
                >
                  ⠿
                </span>
                <span className="font-bold uppercase tracking-tight text-ink">
                  {meta.name}
                </span>
                {!s.visibleDraft && (
                  <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Oculta
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleVisible(s.key, !s.visibleDraft)}
                  className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
                >
                  {s.visibleDraft ? "Ocultar" : "Mostrar"}
                </button>
                {meta.textKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEditing(open ? null : s.key)}
                    className="font-bold uppercase tracking-widest text-[11px] text-ink hover:underline"
                  >
                    {open ? "Cerrar" : "Editar"}
                  </button>
                )}
              </div>
            </div>
            {open && meta.textKeys.length > 0 && (
              <div className="space-y-3 border-t border-line p-4">
                {meta.textKeys.map((tk) => {
                  const t = textByKey.get(tk);
                  if (!t) return null;
                  return (
                    <CmsTextField
                      key={tk}
                      textKey={tk}
                      label={tk.split(".").slice(-1)[0]}
                      published={t.value}
                      draft={t.valueDraft}
                      maxLength={t.maxLength}
                      multiline={t.maxLength > 80}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
