"use client";

import { useEffect, useRef, useState } from "react";

// Wraps children and fades them up the first time they scroll into view.
// Pure IntersectionObserver — no animation library. `delay` (ms) lets callers
// stagger a row of items. `as` picks the wrapper element.
type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "header";
  // Marcador inerte opcional para el editor visual (data-cms-section). No afecta
  // el diseño público: es solo un atributo data-* que el editor usa para
  // seleccionar/resaltar la sección dentro de su iframe.
  dataCmsSection?: string;
};

export default function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
  dataCmsSection,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-reveal
      data-cms-section={dataCmsSection}
      className={`${visible ? "is-visible" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
