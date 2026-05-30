"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// A single on/off toggle for a delivery day or slot. Saves immediately.
export default function DeliveryToggle({
  kind,
  id,
  label,
  initial,
}: {
  kind: "day" | "slot";
  id: string;
  label: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, available: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setOn(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={on}
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
        on ? "border-black bg-black text-white" : "border-line bg-white text-ink"
      }`}
    >
      <span className="font-bold uppercase tracking-wide text-sm">{label}</span>
      <span className="font-bold uppercase tracking-widest text-[11px]">
        {on ? "Activo" : "Inactivo"}
      </span>
    </button>
  );
}
