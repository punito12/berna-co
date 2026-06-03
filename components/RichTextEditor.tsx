"use client";

import { useRef } from "react";

// Lightweight rich-text editor: a plain <textarea> plus a small toolbar (B / I /
// bullet). Content is stored as lightweight markdown — **bold**, *italic*, and
// "- " bullet lines — so it stays plain text in the DB and renders with
// <RichText> on the storefront. No external dependency.
export default function RichTextEditor({
  value,
  onChange,
  rows = 4,
  className = "",
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Wrap the current selection with a marker on each side (bold/italic).
  function wrap(marker: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const sel = value.slice(start, end) || "texto";
    const after = value.slice(end);
    const next = `${before}${marker}${sel}${marker}${after}`;
    onChange(next);
    // Restore selection around the inner text after React re-renders.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + sel.length);
    });
  }

  // Prefix each selected line (or the current line) with "- ".
  function bullet() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    // Expand to full lines.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const toggled = block
      .split("\n")
      .map((ln) => (ln.startsWith("- ") ? ln.slice(2) : `- ${ln}`))
      .join("\n");
    const next = value.slice(0, lineStart) + toggled + value.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + toggled.length);
    });
  }

  return (
    <div className="rounded border border-line bg-white">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        <ToolbarButton label="Negrita" onClick={() => wrap("**")}>
          <span className="font-black">B</span>
        </ToolbarButton>
        <ToolbarButton label="Itálica" onClick={() => wrap("*")}>
          <span className="italic font-serif">I</span>
        </ToolbarButton>
        <ToolbarButton label="Lista" onClick={bullet}>
          <span className="font-bold">•</span>
        </ToolbarButton>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted">
          **negrita** · *itálica* · - lista
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={className}
        placeholder={placeholder}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded text-ink transition-colors hover:bg-cream"
    >
      {children}
    </button>
  );
}
