"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CmsTextField from "@/components/CmsTextField";
import {
  CMS_BLOCK_LABELS,
  CMS_BLOCK_TYPES,
  defaultBlockConfig,
  normalizeBlockType,
  parseBlockConfig,
  sanitizeBlockConfig,
  type CmsBlockConfig,
  type CmsBlockType,
} from "@/lib/cms-blocks";

type Section = {
  key: string;
  type: string;
  visibleDraft: boolean;
  orderDraft: number;
  configDraft: string;
};
type TextRow = {
  key: string;
  value: string;
  valueDraft: string;
  maxLength: number;
};

const LEGACY_TEXT_KEYS: Record<string, string[]> = {
  "home.hero": ["home.hero.title", "home.hero.subtitle", "home.hero.cta"],
  "home.ingredients": [
    "home.ingredients.eyebrow",
    "home.ingredients.title",
    "home.ingredients.item1",
    "home.ingredients.item2",
    "home.ingredients.item3",
  ],
  "home.products": ["catalogo.eyebrow", "catalogo.title", "catalogo.subtitle"],
  "home.pos": ["home.pos.eyebrow", "home.pos.title", "home.pos.subtitle"],
};

function notifyDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}

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
  const [newType, setNewType] = useState<CmsBlockType>("rich_text");
  const [busy, setBusy] = useState<string | null>(null);
  const textByKey = useMemo(() => new Map(texts.map((t) => [t.key, t])), [texts]);

  async function refreshAfterDraft() {
    notifyDraftChanged();
    router.refresh();
  }

  async function persistOrder(next: Section[]) {
    setSections(next);
    await fetch("/api/admin/cms/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "home", keys: next.map((s) => s.key) }),
    });
    refreshAfterDraft();
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
    refreshAfterDraft();
  }

  async function createSection() {
    setBusy("create");
    try {
      const res = await fetch("/api/admin/cms/sections/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "home", type: newType }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "No se pudo crear.");
      const section = data.section as Section;
      setSections((prev) => [...prev, section]);
      setEditing(section.key);
      refreshAfterDraft();
    } finally {
      setBusy(null);
    }
  }

  async function duplicateSection(key: string) {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/cms/sections/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "No se pudo duplicar.");
      const section = data.section as Section;
      setSections((prev) => [...prev, section]);
      setEditing(section.key);
      refreshAfterDraft();
    } finally {
      setBusy(null);
    }
  }

  async function deleteSection(key: string) {
    const ok = window.confirm("Vas a borrar esta sección del CMS.");
    if (!ok) return;
    setBusy(key);
    try {
      const res = await fetch("/api/admin/cms/sections/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "No se pudo borrar.");
      setSections((prev) => prev.filter((s) => s.key !== key));
      if (editing === key) setEditing(null);
      refreshAfterDraft();
    } finally {
      setBusy(null);
    }
  }

  async function saveConfig(key: string, config: CmsBlockConfig) {
    const safe = sanitizeBlockConfig(config as Record<string, unknown>);
    setSections((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, configDraft: JSON.stringify(safe) } : s
      )
    );
    const res = await fetch("/api/admin/cms/sections/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, config: safe }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "No se pudo guardar.");
    refreshAfterDraft();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-white p-4">
        <p className="font-bold uppercase tracking-widest text-[11px] text-muted">
          Nueva sección
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as CmsBlockType)}
            className="rounded border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {CMS_BLOCK_TYPES.filter((type) => type !== "footer").map((type) => (
              <option key={type} value={type}>
                {CMS_BLOCK_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createSection}
            disabled={busy !== null}
            className="bg-black px-4 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {busy === "create" ? "Creando..." : "Crear"}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        Arrastrá para reordenar. Editá una sección para cambiar su configuración
        de bloque. Todo se guarda como borrador hasta publicar.
      </p>

      {sections.map((section) => {
        const type = normalizeBlockType(section.type, section.key);
        const open = editing === section.key;
        const config = parseBlockConfig(section.configDraft);
        const legacyKeys = LEGACY_TEXT_KEYS[section.key] ?? [];
        return (
          <div
            key={section.key}
            draggable
            onDragStart={() => setDragKey(section.key)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(section.key)}
            className={`rounded-lg border bg-white ${
              dragKey === section.key ? "border-black opacity-60" : "border-line"
            } ${!section.visibleDraft ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="cursor-grab select-none text-muted" title="Arrastrar">
                  ⠿
                </span>
                <div>
                  <p className="font-bold uppercase tracking-tight text-ink">
                    {config.title || CMS_BLOCK_LABELS[type]}
                  </p>
                  <p className="text-[11px] uppercase tracking-widest text-muted">
                    {CMS_BLOCK_LABELS[type]} · {section.key}
                  </p>
                </div>
                {!section.visibleDraft && (
                  <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Oculta
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleVisible(section.key, !section.visibleDraft)}
                  className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink"
                >
                  {section.visibleDraft ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(open ? null : section.key)}
                  className="font-bold uppercase tracking-widest text-[11px] text-ink hover:underline"
                >
                  {open ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => duplicateSection(section.key)}
                  disabled={busy !== null}
                  className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink disabled:opacity-40"
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => deleteSection(section.key)}
                  disabled={busy !== null || section.key === "home.footer"}
                  className="font-bold uppercase tracking-widest text-[11px] text-muted hover:text-ink disabled:opacity-40"
                >
                  Borrar
                </button>
              </div>
            </div>
            {open && (
              <div className="space-y-4 border-t border-line p-4">
                {legacyKeys.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-bold uppercase tracking-widest text-[11px] text-muted">
                      Campos heredados
                    </p>
                    {legacyKeys.map((tk) => {
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
                {type !== "footer" && (
                  <BlockConfigEditor
                    type={type}
                    config={config}
                    onSave={(next) => saveConfig(section.key, next)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BlockConfigEditor({
  type,
  config,
  onSave,
}: {
  type: CmsBlockType;
  config: CmsBlockConfig;
  onSave: (config: CmsBlockConfig) => void;
}) {
  const [draft, setDraft] = useState<CmsBlockConfig>({
    ...defaultBlockConfig(type),
    ...config,
  });
  const [saving, setSaving] = useState(false);

  function update(next: CmsBlockConfig) {
    setDraft(next);
  }

  async function uploadImage(file: File) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) return alert(data.error || "No se pudo subir.");
      update({ ...draft, imageUrl: data.url });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-cream/30 p-4">
      <p className="font-bold uppercase tracking-widest text-[11px] text-muted">
        Configuración del bloque
      </p>
      <div className="mt-3 grid gap-3">
        {["hero", "products_grid", "features", "image_text", "map"].includes(type) && (
          <TextInput
            label="Bajada"
            value={draft.eyebrow ?? ""}
            onChange={(v) => update({ ...draft, eyebrow: v })}
          />
        )}
        {type !== "map" && (
          <TextInput
            label="Título"
            value={draft.title ?? ""}
            onChange={(v) => update({ ...draft, title: v })}
          />
        )}
        {["hero", "products_grid", "image_text", "cta", "newsletter", "map"].includes(type) && (
          <TextInput
            label="Subtítulo"
            value={draft.subtitle ?? ""}
            onChange={(v) => update({ ...draft, subtitle: v })}
          />
        )}
        {["rich_text", "image_text"].includes(type) && (
          <TextArea
            label="Texto"
            value={draft.body ?? ""}
            onChange={(v) => update({ ...draft, body: v })}
          />
        )}
        {["hero", "cta", "image_text"].includes(type) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Texto del botón"
              value={draft.ctaLabel ?? ""}
              onChange={(v) => update({ ...draft, ctaLabel: v })}
            />
            <TextInput
              label="Link del botón"
              value={draft.ctaHref ?? ""}
              onChange={(v) => update({ ...draft, ctaHref: v })}
            />
          </div>
        )}
        {["hero", "image_text"].includes(type) && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <TextInput
              label="Imagen"
              value={draft.imageUrl ?? ""}
              onChange={(v) => update({ ...draft, imageUrl: v })}
            />
            <label className="mt-5 cursor-pointer bg-black px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-white">
              Subir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
            </label>
          </div>
        )}
        {type === "map" && (
          <TextInput
            label="URL del mapa"
            value={draft.mapSrc ?? ""}
            onChange={(v) => update({ ...draft, mapSrc: v })}
          />
        )}
        {type === "features" && (
          <Repeater
            label="Items"
            rows={draft.items ?? []}
            empty={{ title: "Nuevo item", body: "" }}
            onChange={(items) => update({ ...draft, items })}
          />
        )}
        {type === "faq" && (
          <FaqRepeater
            rows={draft.faqs ?? []}
            onChange={(faqs) => update({ ...draft, faqs })}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => onSave(draft)}
        disabled={saving}
        className="mt-4 bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
      >
        Guardar bloque
      </button>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-black"
      />
    </label>
  );
}

function Repeater({
  label,
  rows,
  empty,
  onChange,
}: {
  label: string;
  rows: { title: string; body?: string }[];
  empty: { title: string; body?: string };
  onChange: (rows: { title: string; body?: string }[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
        {label}
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded border border-line bg-white p-3">
            <TextInput
              label="Título"
              value={row.title}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, title: v } : r)))
              }
            />
            <TextInput
              label="Texto"
              value={row.body ?? ""}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, body: v } : r)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="justify-self-start text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, empty])}
        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:underline"
      >
        Agregar item
      </button>
    </div>
  );
}

function FaqRepeater({
  rows,
  onChange,
}: {
  rows: { question: string; answer: string }[];
  onChange: (rows: { question: string; answer: string }[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
        Preguntas
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded border border-line bg-white p-3">
            <TextInput
              label="Pregunta"
              value={row.question}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, question: v } : r)))
              }
            />
            <TextArea
              label="Respuesta"
              value={row.answer}
              onChange={(v) =>
                onChange(rows.map((r, idx) => (idx === i ? { ...r, answer: v } : r)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="justify-self-start text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { question: "Pregunta", answer: "Respuesta" }])}
        className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink hover:underline"
      >
        Agregar pregunta
      </button>
    </div>
  );
}
