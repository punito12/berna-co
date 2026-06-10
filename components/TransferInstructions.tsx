"use client";

import { useState } from "react";

function formatPrice(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function TransferInstructions({
  alias,
  cbu,
  whatsappNumber,
  shortId,
  total,
  labels = {},
}: {
  alias: string;
  cbu: string;
  whatsappNumber: string;
  shortId: string;
  total: number;
  labels?: {
    alias?: string;
    cbu?: string;
    copy?: string;
    copied?: string;
    whatsapp?: string;
    missingData?: string;
    reserved?: string;
  };
}) {
  const waDigits = (whatsappNumber || "").replace(/[^0-9]/g, "");
  const waMsg = `Hola! Te envío el comprobante de transferencia del pedido #${shortId} por ${formatPrice(
    total
  )}`;
  const waUrl = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="mt-5 space-y-3">
      {/* Alias */}
      {alias && (
        <CopyField
          label={labels.alias ?? "Alias"}
          value={alias}
          copyLabel={labels.copy}
          copiedLabel={labels.copied}
          big
        />
      )}
      {/* CBU */}
      {cbu && (
        <CopyField
          label={labels.cbu ?? "CBU"}
          value={cbu}
          copyLabel={labels.copy}
          copiedLabel={labels.copied}
        />
      )}

      {!alias && !cbu && (
        <p className="rounded-lg border border-dashed border-line bg-white px-4 py-4 text-center text-sm text-muted">
          {labels.missingData ??
            "Los datos de transferencia todavía no están cargados. Escribinos por WhatsApp y te los pasamos."}
        </p>
      )}

      {/* WhatsApp — big and clear */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-5 text-center font-black uppercase tracking-widest text-base text-white transition-colors hover:bg-green-700"
      >
        <span aria-hidden>📲</span>
        {labels.whatsapp ?? "Enviar comprobante por WhatsApp"}
      </a>
      <p className="text-center text-xs text-muted">
        {labels.reserved ??
          "Tu pedido queda reservado. Lo confirmamos cuando recibamos el comprobante."}
      </p>
    </div>
  );
}

function CopyField({
  label,
  value,
  copyLabel = "Copiar",
  copiedLabel = "¡Copiado!",
  big,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  copiedLabel?: string;
  big?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable — select via prompt fallback.
      window.prompt(`Copiá el ${label}:`, value);
    }
  }

  return (
    <div className="rounded-xl border-2 border-black bg-white p-4">
      <p className="font-bold uppercase tracking-widest text-[10px] text-muted">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span
          className={`min-w-0 break-all font-black text-ink ${
            big ? "text-2xl" : "text-base"
          }`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-black px-4 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
