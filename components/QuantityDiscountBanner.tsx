import { listActiveQuantityTiers } from "@/lib/quantity-discounts";

// A black strip (white text) announcing the active volume-discount tiers. Only
// renders when at least one tier is active. Server component.
export default async function QuantityDiscountBanner() {
  const tiers = await listActiveQuantityTiers();
  if (tiers.length === 0) return null;

  // Sort ascending by min units and summarize each tier.
  const sorted = [...tiers].sort((a, b) => a.minKg - b.minKg);
  const parts = sorted.map(
    (t) => `${t.minKg}+ unidades ${t.discountPercent}% OFF`
  );

  return (
    <div className="bg-black px-4 py-2 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
        🎉 Descuento por cantidad: {parts.join(" · ")}
      </p>
    </div>
  );
}
