"use client";

import { useState } from "react";

// One editable site text: label, textarea/input, character counter, "restaurar
// al original" button, and auto-save of the draft on blur. Shows a dot when the
// draft differs from the published value.
export default function CmsTextField({
  textKey,
  label,
  published,
  draft,
  maxLength,
  multiline = false,
}: {
  textKey: string;
  label: string;
  published: string;
  draft: string;
  maxLength: number;
  multiline?: boolean;
}) {
  const [value, setValue] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const changed = value !== published;

  async function save() {
    if (value === draft) return; // nothing new
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: textKey, value }),
      });
      if (res.ok) {
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1200);
      }
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: textKey, action: "restore" }),
      });
      if (res.ok) setValue(published);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          {label}
          {changed && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-amber-500"
              title="Cambio sin publicar"
            />
          )}
        </span>
        <span className="text-[10px] tabular-nums text-muted">
          {value.length}/{maxLength}
        </span>
      </div>
      {multiline ? (
        <textarea
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          rows={3}
          className={inputClass + " resize-y"}
        />
      ) : (
        <input
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          className={inputClass}
        />
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={restore}
          disabled={saving || !changed}
          className="font-bold uppercase tracking-widest text-[10px] text-muted hover:text-ink disabled:opacity-40"
        >
          Restaurar al original
        </button>
        {saving && <span className="text-[10px] text-muted">Guardando…</span>}
        {savedTick && (
          <span className="text-[10px] font-bold text-green-700">✓ Guardado</span>
        )}
      </div>
    </div>
  );
}
