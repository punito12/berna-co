"use client";

import { useState } from "react";

// Newsletter signup used in the footer. Light styling so it reads on dark bg.
export default function NewsletterForm({
  title = "Sumate al newsletter",
  subtitle = "Novedades, recetas y promos. Sin spam.",
  placeholder = "tu@email.com",
  buttonLabel = "Sumarme",
  successMessage = "¡Gracias! Te vas a enterar de las novedades.",
}: {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonLabel?: string;
  successMessage?: string;
}) {
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
      setMessage(successMessage);
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Hubo un problema de conexión. Probá de nuevo.");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <p className="font-bold uppercase tracking-widest text-xs text-cream">
        {title}
      </p>
      <p className="mt-1 text-sm text-white/60">
        {subtitle}
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded border border-white/20 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-white"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-white px-4 py-3 font-bold uppercase tracking-widest text-xs text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-cream active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {status === "sending" ? "…" : buttonLabel}
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
