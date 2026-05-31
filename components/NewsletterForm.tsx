"use client";

import { useState } from "react";

// Newsletter signup used in the footer. Light styling so it reads on dark bg.
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "No pudimos suscribirte.");
        return;
      }
      setStatus("ok");
      setMessage("¡Gracias! Te vas a enterar de las novedades.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Hubo un problema de conexión. Probá de nuevo.");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <p className="font-bold uppercase tracking-widest text-xs text-cream">
        Sumate al newsletter
      </p>
      <p className="mt-1 text-sm text-white/60">
        Novedades, recetas y promos. Sin spam.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1 rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-white px-4 py-2 font-bold uppercase tracking-widest text-xs text-black transition-colors hover:bg-cream disabled:opacity-50"
        >
          {status === "sending" ? "…" : "Sumarme"}
        </button>
      </form>
      {message && (
        <p
          className={`mt-2 text-xs font-bold ${
            status === "ok" ? "text-cream" : "text-white"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
