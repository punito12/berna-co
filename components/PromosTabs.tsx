"use client";

import { useState } from "react";

// In-page tabs for the Promociones screen: discount codes vs volume discounts.
export default function PromosTabs({
  codes,
  cantidad,
}: {
  codes: React.ReactNode;
  cantidad: React.ReactNode;
}) {
  const [tab, setTab] = useState<"codigos" | "cantidad">("codigos");

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-line">
        <TabButton active={tab === "codigos"} onClick={() => setTab("codigos")}>
          Códigos
        </TabButton>
        <TabButton
          active={tab === "cantidad"}
          onClick={() => setTab("cantidad")}
        >
          Descuento por cantidad
        </TabButton>
      </div>
      {tab === "codigos" ? codes : cantidad}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 font-bold uppercase tracking-wide text-xs transition-colors ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
