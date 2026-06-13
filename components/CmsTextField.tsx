"use client";

import { useEffect, useState } from "react";
import {
  parseTextStyle,
  sanitizeTextStyle,
  type CmsTextStyle,
} from "@/lib/cms-text-styles";
import CmsStylePreview from "@/components/CmsStylePreview";
import { CMS_FONT_OPTIONS } from "@/lib/cms-fonts";
import { postCmsDraft, notifyCmsDraftChanged } from "@/lib/cms-client";

const FONT_OPTIONS = ["", ...CMS_FONT_OPTIONS];

const WEIGHT_OPTIONS = ["", "300", "400", "500", "600", "700", "800", "900"];

// One editable site text: label, textarea/input, character counter, an explicit
// "Guardar cambios" button (saves the DRAFT — not published), and "restaurar al
// original". Saving is manual and reliable: no autosave, no infinite spinner.
// The amber dot means "this draft differs from what's published".
export default function CmsTextField({
  textKey,
  label,
  published,
  draft,
  style,
  styleDraft,
  maxLength,
  multiline = false,
  allowStyle = true,
}: {
  textKey: string;
  label: string;
  published: string;
  draft: string;
  style?: string;
  styleDraft?: string;
  maxLength: number;
  multiline?: boolean;
  allowStyle?: boolean;
}) {
  // `value`/`textStyle` = what's in the inputs. `savedValue`/`savedStyle` = what
  // the DB draft currently holds (updated only after a successful save).
  const [value, setValue] = useState(draft);
  const [savedValue, setSavedValue] = useState(draft);
  const [textStyle, setTextStyle] = useState<CmsTextStyle>(
    parseTextStyle(styleDraft ?? "{}")
  );
  const [savedStyle, setSavedStyle] = useState<CmsTextStyle>(
    parseTextStyle(styleDraft ?? "{}")
  );
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishedStyle = parseTextStyle(style ?? "{}");

  // Local edits not yet saved to the draft.
  const dirty =
    value !== savedValue ||
    JSON.stringify(textStyle) !== JSON.stringify(savedStyle);
  // Draft differs from published (will change the public site when published).
  const changedFromPublished =
    savedValue !== published ||
    JSON.stringify(savedStyle) !== JSON.stringify(publishedStyle);

  // Sync from props: happens on initial load and after publish/discard/revert
  // (router.refresh re-runs the server page and passes fresh values).
  useEffect(() => {
    setValue(draft);
    setSavedValue(draft);
  }, [draft]);

  useEffect(() => {
    const next = parseTextStyle(styleDraft ?? "{}");
    setTextStyle(next);
    setSavedStyle(next);
  }, [styleDraft]);

  // Discard: reset the inputs to the published values immediately.
  useEffect(() => {
    const resetToPublished = () => {
      const nextStyle = parseTextStyle(style ?? "{}");
      setValue(published);
      setSavedValue(published);
      setTextStyle(nextStyle);
      setSavedStyle(nextStyle);
      setSaving(false);
      setSavedTick(false);
      setError(null);
    };
    window.addEventListener("cms:drafts-discarding", resetToPublished);
    window.addEventListener("cms:drafts-discarded", resetToPublished);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToPublished);
      window.removeEventListener("cms:drafts-discarded", resetToPublished);
    };
  }, [published, style]);

  function flashSaved() {
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  }

  // Saves whatever changed (text and/or style) to the draft, in one click.
  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    const textChanged = value !== savedValue;
    const safeStyle = sanitizeTextStyle(textStyle as Record<string, unknown>);
    const styleChanged =
      JSON.stringify(safeStyle) !== JSON.stringify(savedStyle);
    try {
      if (textChanged) {
        const r = await postCmsDraft("/api/admin/cms/text", {
          key: textKey,
          value,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setSavedValue(value);
      }
      if (styleChanged) {
        const r = await postCmsDraft("/api/admin/cms/text", {
          key: textKey,
          style: safeStyle,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setTextStyle(safeStyle);
        setSavedStyle(safeStyle);
      }
      notifyCmsDraftChanged();
      flashSaved();
    } finally {
      setSaving(false);
    }
  }

  // Resets BOTH text and style of this field back to the published values.
  async function restore() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await postCmsDraft("/api/admin/cms/text", {
        key: textKey,
        action: "restore",
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const r2 = await postCmsDraft("/api/admin/cms/text", {
        key: textKey,
        action: "restore-style",
      });
      if (!r2.ok) {
        setError(r2.error);
        return;
      }
      const nextStyle = parseTextStyle(style ?? "{}");
      setValue(published);
      setSavedValue(published);
      setTextStyle(nextStyle);
      setSavedStyle(nextStyle);
      notifyCmsDraftChanged();
      flashSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black";

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        dirty ? "border-amber-400" : "border-line"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wide text-[11px] text-muted">
          {label}
          {changedFromPublished && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-amber-500"
              title="Cambio guardado, falta publicar"
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
          rows={3}
          className={inputClass + " resize-y"}
        />
      ) : (
        <input
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="rounded bg-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={restore}
          disabled={saving || !changedFromPublished}
          className="font-bold uppercase tracking-widest text-[10px] text-muted hover:text-ink disabled:opacity-40"
        >
          Restaurar al original
        </button>
        {dirty && !saving && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Sin guardar
          </span>
        )}
        {savedTick && !dirty && (
          <span className="text-[10px] font-bold text-green-700">✓ Guardado</span>
        )}
      </div>
      {error && (
        <p className="mt-2 text-[11px] font-bold text-red-700">{error}</p>
      )}

      {allowStyle && (
        <details className="mt-3 border-t border-line pt-3">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted">
            Opciones avanzadas de diseño
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <StyleSelect
              label="Fuente"
              value={textStyle.fontFamily ?? ""}
              options={FONT_OPTIONS}
              emptyLabel="Actual"
              onChange={(fontFamily) =>
                setTextStyle({ ...textStyle, fontFamily: fontFamily || undefined })
              }
            />
            <StyleSelect
              label="Peso"
              value={textStyle.fontWeight ?? ""}
              options={WEIGHT_OPTIONS}
              emptyLabel="Actual"
              onChange={(fontWeight) =>
                setTextStyle({ ...textStyle, fontWeight: fontWeight || undefined })
              }
            />
            <StyleInput
              label="Tamaño desktop"
              value={textStyle.fontSize ?? ""}
              placeholder="Ej: 48px"
              onChange={(fontSize) =>
                setTextStyle({ ...textStyle, fontSize: fontSize || undefined })
              }
            />
            <StyleInput
              label="Tamaño mobile"
              value={textStyle.fontSizeMobile ?? ""}
              placeholder="Ej: 32px"
              onChange={(fontSizeMobile) =>
                setTextStyle({
                  ...textStyle,
                  fontSizeMobile: fontSizeMobile || undefined,
                })
              }
            />
            <StyleInput
              label="Interlineado"
              value={textStyle.lineHeight ?? ""}
              placeholder="Ej: 1.1"
              onChange={(lineHeight) =>
                setTextStyle({ ...textStyle, lineHeight: lineHeight || undefined })
              }
            />
            <StyleInput
              label="Espaciado"
              value={textStyle.letterSpacing ?? ""}
              placeholder="Ej: 0.02em"
              onChange={(letterSpacing) =>
                setTextStyle({
                  ...textStyle,
                  letterSpacing: letterSpacing || undefined,
                })
              }
            />
            <StyleToggle
              label="Itálica"
              checked={textStyle.italic === true}
              onChange={(italic) =>
                setTextStyle({ ...textStyle, italic: italic || undefined })
              }
            />
            <StyleToggle
              label="Mayúsculas"
              checked={textStyle.uppercase === true}
              onChange={(uppercase) =>
                setTextStyle({ ...textStyle, uppercase: uppercase || undefined })
              }
            />
          </div>
          <CmsStylePreview text={value} style={textStyle} />
          <p className="mt-2 text-[10px] text-muted">
            Los cambios de diseño se guardan con el botón “Guardar cambios” de
            arriba.
          </p>
        </details>
      )}
    </div>
  );
}

function StyleSelect({
  label,
  value,
  options,
  emptyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || emptyLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

// Local-only style input: edits update parent state on change (no autosave).
function StyleInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onChange(local.trim())}
        className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-ink"
      />
    </label>
  );
}

function StyleToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-bold text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-black"
      />
      {label}
    </label>
  );
}
