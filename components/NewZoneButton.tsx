"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Creates a new zone from a name, then refreshes the list.
export default function NewZoneButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return setError("Poné un nombre.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "No se pudo crear.");
      }
      setName("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-4">
      <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-muted">
        Nueva zona
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
          className="flex-1 rounded border border-line bg-white px-3 py-2 text-ink outline-none focus:border-black"
          placeholder="Ej: San Isidro"
        />
        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="bg-black px-5 py-2 font-bold uppercase tracking-widest text-xs text-white disabled:opacity-40"
        >
          {saving ? "…" : "Crear"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-bold text-ink">{error}</p>}
    </div>
  );
}
