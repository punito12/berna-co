"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseTextStyle,
  sanitizeTextStyle,
  type CmsTextStyle,
} from "@/lib/cms-text-styles";
import CmsStylePreview from "@/components/CmsStylePreview";
import { CMS_FONT_OPTIONS } from "@/lib/cms-fonts";

const FONT_OPTIONS = ["", ...CMS_FONT_OPTIONS];

const WEIGHT_OPTIONS = ["", "300", "400", "500", "600", "700", "800", "900"];

function notifyDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}

// One editable site text: label, textarea/input, character counter, "restaurar
// al original" button, and auto-save of the draft after typing pauses. Shows a
// dot when the draft differs from the published value.
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
  const saveRunRef = useRef(0);
  const saveAbortRef = useRef<AbortController | null>(null);
  const publishedStyle = parseTextStyle(style ?? "{}");
  const changed =
    value !== published ||
    JSON.stringify(textStyle) !== JSON.stringify(publishedStyle);

  useEffect(() => {
    setValue(draft);
    setSavedValue(draft);
  }, [draft]);

  useEffect(() => {
    const next = parseTextStyle(styleDraft ?? "{}");
    setTextStyle(next);
    setSavedStyle(next);
  }, [styleDraft]);

  useEffect(() => {
    const resetToPublished = () => {
      saveRunRef.current += 1;
      saveAbortRef.current?.abort();
      saveAbortRef.current = null;
      const nextStyle = parseTextStyle(style ?? "{}");
      setValue(published);
      setSavedValue(published);
      setTextStyle(nextStyle);
      setSavedStyle(nextStyle);
      setSaving(false);
      setSavedTick(false);
    };
    window.addEventListener("cms:drafts-discarding", resetToPublished);
    window.addEventListener("cms:drafts-discarded", resetToPublished);
    return () => {
      window.removeEventListener("cms:drafts-discarding", resetToPublished);
      window.removeEventListener("cms:drafts-discarded", resetToPublished);
    };
  }, [published, style]);

  useEffect(() => {
    if (value === savedValue) return;
    const timer = window.setTimeout(() => {
      void save(value);
    }, 700);
    return () => window.clearTimeout(timer);
    // save intentionally stays outside the dependency list because it reads the
    // latest refs/state through the explicit nextValue argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, savedValue]);

  async function save(nextValue = value) {
    if (nextValue === savedValue) return; // nothing new
    const run = ++saveRunRef.current;
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: textKey, value: nextValue }),
        signal: controller.signal,
      });
      if (run !== saveRunRef.current) return;
      if (res.ok) {
        setSavedValue(nextValue);
        notifyDraftChanged();
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1200);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[cms text autosave]", error);
      }
    } finally {
      if (run === saveRunRef.current) setSaving(false);
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
      if (res.ok) {
        setValue(published);
        setSavedValue(published);
        notifyDraftChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveStyle(nextStyle: CmsTextStyle) {
    const safe = sanitizeTextStyle(nextStyle as Record<string, unknown>);
    setTextStyle(safe);
    if (JSON.stringify(safe) === JSON.stringify(savedStyle)) return;
    const run = ++saveRunRef.current;
    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: textKey, style: safe }),
        signal: controller.signal,
      });
      if (run !== saveRunRef.current) return;
      if (res.ok) {
        setSavedStyle(safe);
        notifyDraftChanged();
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1200);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[cms style autosave]", error);
      }
    } finally {
      if (run === saveRunRef.current) setSaving(false);
    }
  }

  async function restoreStyle() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: textKey, action: "restore-style" }),
      });
      if (res.ok) {
        setTextStyle(publishedStyle);
        setSavedStyle(publishedStyle);
        notifyDraftChanged();
      }
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
          onBlur={() => void save(value)}
          rows={3}
          className={inputClass + " resize-y"}
        />
      ) : (
        <input
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void save(value)}
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
              saveStyle({ ...textStyle, fontFamily: fontFamily || undefined })
            }
          />
          <StyleSelect
            label="Peso"
            value={textStyle.fontWeight ?? ""}
            options={WEIGHT_OPTIONS}
            emptyLabel="Actual"
            onChange={(fontWeight) =>
              saveStyle({ ...textStyle, fontWeight: fontWeight || undefined })
            }
          />
          <StyleInput
            label="Tamaño desktop"
            value={textStyle.fontSize ?? ""}
            placeholder="Ej: 48px"
            onBlur={(fontSize) =>
              saveStyle({ ...textStyle, fontSize: fontSize || undefined })
            }
          />
          <StyleInput
            label="Tamaño mobile"
            value={textStyle.fontSizeMobile ?? ""}
            placeholder="Ej: 32px"
            onBlur={(fontSizeMobile) =>
              saveStyle({
                ...textStyle,
                fontSizeMobile: fontSizeMobile || undefined,
              })
            }
          />
          <StyleInput
            label="Interlineado"
            value={textStyle.lineHeight ?? ""}
            placeholder="Ej: 1.1"
            onBlur={(lineHeight) =>
              saveStyle({ ...textStyle, lineHeight: lineHeight || undefined })
            }
          />
          <StyleInput
            label="Espaciado"
            value={textStyle.letterSpacing ?? ""}
            placeholder="Ej: 0.02em"
            onBlur={(letterSpacing) =>
              saveStyle({
                ...textStyle,
                letterSpacing: letterSpacing || undefined,
              })
            }
          />
          <StyleToggle
            label="Itálica"
            checked={textStyle.italic === true}
            onChange={(italic) =>
              saveStyle({ ...textStyle, italic: italic || undefined })
            }
          />
          <StyleToggle
            label="Negrita / mayúsculas"
            checked={textStyle.uppercase === true}
            onChange={(uppercase) =>
              saveStyle({ ...textStyle, uppercase: uppercase || undefined })
            }
          />
        </div>
        <CmsStylePreview text={value} style={textStyle} />
        <button
          type="button"
          onClick={restoreStyle}
          disabled={saving || JSON.stringify(textStyle) === JSON.stringify(publishedStyle)}
          className="mt-3 font-bold uppercase tracking-widest text-[10px] text-muted hover:text-ink disabled:opacity-40"
        >
          Restaurar estilo publicado
        </button>
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

function StyleInput({
  label,
  value,
  placeholder,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder: string;
  onBlur: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const next = local.trim();
    if (next === value) return;
    const timer = window.setTimeout(() => onBlur(next), 700);
    return () => window.clearTimeout(timer);
  }, [local, onBlur, value]);
  return (
    <label className="block">
      <span className="mb-1 block font-bold uppercase tracking-wide text-[10px] text-muted">
        {label}
      </span>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onBlur(local.trim())}
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
