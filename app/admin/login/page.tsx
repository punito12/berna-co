"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BernaLogo from "@/components/BernaLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "No se pudo ingresar.");
        setSubmitting(false);
        return;
      }
      // Full reload so the server re-reads the cookie and renders the panel.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Hubo un problema de conexión. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8"
      >
        <BernaLogo variant="dark" size="sm" className="mx-auto" />
        <h1 className="mt-8 text-center font-black uppercase tracking-tight text-2xl text-ink">
          Panel
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          Ingresá la contraseña para administrar.
        </p>

        <label className="mt-6 block">
          <span className="mb-1.5 block font-bold uppercase tracking-wide text-[11px] text-muted">
            Contraseña
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-black"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-lg border border-black px-4 py-3 text-sm font-bold text-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full bg-black px-4 py-3 font-bold uppercase tracking-widest text-sm text-white transition-colors hover:bg-ink/80 disabled:opacity-50"
        >
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
