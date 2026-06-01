"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Inline "barrio" assignment for a web order: type/pick and save on blur or
// Enter. Lets the admin attribute a web order to a neighborhood for billing.
export default function OrderNeighborhood({
  orderId,
  initial,
  neighborhoods,
}: {
  orderId: string;
  initial: string;
  neighborhoods: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (value.trim() === initial.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(
        `/api/admin/orders/${orderId}/neighborhood`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ neighborhood: value }),
        }
      );
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      // keep the field as-is on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="font-bold uppercase tracking-wide text-[10px] text-muted">
        Barrio
      </span>
      <input
        type="text"
        list={`barrios-order-${orderId}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="Asignar…"
        className="w-40 rounded border border-line bg-white px-2 py-1 text-sm text-ink outline-none focus:border-black"
      />
      <datalist id={`barrios-order-${orderId}`}>
        {neighborhoods.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      {saving && <span className="text-[11px] text-muted">…</span>}
      {saved && !saving && (
        <span className="text-[11px] font-bold text-ink">✓</span>
      )}
    </div>
  );
}
