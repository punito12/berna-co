"use client";

import { useState } from "react";

// Pliega su contenido a N líneas en MOBILE con un "Leer más" que lo expande.
// En desktop (sm+) el texto se muestra siempre completo y el botón no existe.
export default function ExpandableText({
  children,
  moreLabel = "Leer más",
  lessLabel = "Leer menos",
}: {
  children: React.ReactNode;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={open ? "" : "line-clamp-4 sm:line-clamp-none"}>
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 inline-flex min-h-10 items-center rounded-full border border-white/30 px-5 py-2 font-bold uppercase tracking-widest text-[11px] text-white transition-all duration-200 active:scale-95 sm:hidden"
      >
        {open ? lessLabel : moreLabel}
      </button>
    </div>
  );
}
