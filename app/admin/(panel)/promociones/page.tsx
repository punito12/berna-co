import { listDiscountCodes } from "@/lib/management";
import DiscountManager from "@/components/DiscountManager";

// Promotions: discount codes (% or fixed). Per-product promos (2x1, % off) are
// set in the product editor (Productos).
export default async function AdminPromosPage() {
  const codes = await listDiscountCodes();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Promociones
      </h1>
      <p className="mb-6 text-sm text-muted">
        Códigos de descuento que el cliente escribe en el checkout. Las promos
        por producto (2x1, 3x2 o % off) se configuran en cada producto, en{" "}
        <span className="font-bold text-ink">Productos</span>.
      </p>

      <DiscountManager
        codes={codes.map((c) => ({
          id: c.id,
          code: c.code,
          kind: c.kind,
          value: c.value,
          active: c.active,
          expiresAt: c.expiresAt
            ? c.expiresAt.toISOString().slice(0, 10)
            : "",
          maxUses: c.maxUses,
          minTotal: c.minTotal,
          usedCount: c.usedCount,
        }))}
      />
    </div>
  );
}
