"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Horizontal sub-navigation for a section (e.g. Ventas: Cargar venta · Promos).
export default function SubTabs({
  tabs,
}: {
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-2 font-bold uppercase tracking-wide text-xs transition-colors ${
              active
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
