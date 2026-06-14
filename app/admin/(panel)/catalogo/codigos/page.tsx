import { listDiscountCodes } from "@/lib/management";
import DiscountManager from "@/components/DiscountManager";

// Catálogo → Códigos de descuento: codes the customer types at checkout
// (% or fixed). Per-product promos (2x1, 3x2, % off) live in the product editor
// and are surfaced under Catálogo → Promociones.
export default async function CodigosDescuentoPage() {
  const codes = await listDiscountCodes();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Cupones de descuento
      </h1>
      <p className="mb-6 text-sm text-muted">
        Cupones: códigos que el cliente escribe en el checkout. No confundir con
        la oferta del producto (2x1, 3x2 o % off, se carga en cada producto, en{" "}
        <span className="font-bold text-ink">Productos</span>), el descuento por
        cantidad de unidades, ni el descuento por forma de pago.
      </p>

      <DiscountManager
        codes={codes.map((c) => ({
          id: c.id,
          code: c.code,
          kind: c.kind,
          value: c.value,
          active: c.active,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "",
          maxUses: c.maxUses,
          minTotal: c.minTotal,
          usedCount: c.usedCount,
        }))}
      />
    </div>
  );
}
