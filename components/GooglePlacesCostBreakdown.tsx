"use client";

import type { GooglePlacesSkuEstimate } from "@/lib/google-places-pricing";

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function endpointLabel(endpoint: GooglePlacesSkuEstimate["endpoint"]): string {
  if (endpoint === "TEXT_SEARCH") return "Búsqueda de IDs";
  if (endpoint === "PLACE_DETAILS") return "Detalle por lugar único";
  return "Búsqueda cercana";
}

export default function GooglePlacesCostBreakdown({
  estimates,
  maxCostBeforeFreeUsd,
  estimatedCostAfterFreeUsd,
}: {
  estimates: GooglePlacesSkuEstimate[];
  maxCostBeforeFreeUsd: number;
  estimatedCostAfterFreeUsd: number;
}) {
  const enterpriseEnabled = estimates.some((row) => row.enterpriseWarning);
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white">
      <div className="grid grid-cols-2 border-b border-line bg-cream/40">
        <div className="border-r border-line p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
            Máximo antes del free tier
          </p>
          <p className="mt-1 text-xl font-black text-ink">
            {usd(maxCostBeforeFreeUsd)}
          </p>
        </div>
        <div className="p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
            Estimado después del free tier
          </p>
          <p className="mt-1 text-xl font-black text-ink">
            {usd(estimatedCostAfterFreeUsd)}
          </p>
        </div>
      </div>

      {enterpriseEnabled && (
        <p className="border-b border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
          Advertencia: este paso habilita campos Enterprise. Solo debe
          ejecutarse después de una selección manual.
        </p>
      )}

      <div className="divide-y divide-line">
        {estimates.map((row) => (
          <div key={`${row.endpoint}:${row.skuKey}`} className="p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
                  {endpointLabel(row.endpoint)}
                </p>
                <p className="text-sm font-black text-ink">{row.skuLabel}</p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                  row.enterpriseWarning
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-line bg-cream/50 text-ink"
                }`}
              >
                {row.tier.replace("_", " + ")}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted">Requests por SKU</dt>
                <dd className="font-bold text-ink">{row.requests}</dd>
              </div>
              <div>
                <dt className="text-muted">Billables estimados</dt>
                <dd className="font-bold text-ink">
                  {row.estimatedBillableRequests}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Free tier del SKU</dt>
                <dd className="font-bold text-ink">
                  {row.freeUsageCap === null
                    ? "Ilimitado"
                    : row.freeUsageCap.toLocaleString("es-AR")}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Uso mensual asumido</dt>
                <dd className="font-bold text-ink">
                  {row.monthlyUsageAssumed.toLocaleString("es-AR")}
                  {row.freeRequestsRemaining !== null
                    ? ` · ${row.freeRequestsRemaining.toLocaleString(
                        "es-AR"
                      )} libres`
                    : ""}
                </dd>
              </div>
            </dl>
            <p className="mt-2 break-words font-mono text-[10px] leading-relaxed text-muted">
              Field mask: {row.fieldMask.join(", ")}
            </p>
            <p className="mt-1 break-words text-[10px] text-ink">
              <strong>Fields que disparan {row.skuLabel}:</strong>{" "}
              {row.triggeringFields.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
