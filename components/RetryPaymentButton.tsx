"use client";

import { useState } from "react";

export default function RetryPaymentButton({
  orderId,
  label = "Reintentar con Mercado Pago",
}: {
  orderId: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/retry-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentUrl) {
        setError(data.error ?? "No pudimos generar el link. Intentá de nuevo.");
        return;
      }
      window.location.href = data.paymentUrl;
    } catch {
      setError("Hubo un problema de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        className="bg-black px-6 py-3 font-bold uppercase tracking-widest text-sm text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink/80 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Generando link…" : label}
      </button>
      {error && (
        <p className="text-xs text-accent">{error}</p>
      )}
    </div>
  );
}
