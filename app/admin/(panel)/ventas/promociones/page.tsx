import { listDiscountCodes } from "@/lib/management";
import { listQuantityDiscounts } from "@/lib/quantity-discounts";
import DiscountManager from "@/components/DiscountManager";
import QuantityDiscountManager from "@/components/QuantityDiscountManager";
import PromosTabs from "@/components/PromosTabs";
import SubTabs from "@/components/SubTabs";

const VENTAS_TABS = [
  { href: "/admin/ventas", label: "Cargar venta" },
  { href: "/admin/ventas/promociones", label: "Promociones" },
];

// Promotions: discount codes (% or fixed) + volume discounts (por cantidad).
// Per-product promos (2x1, % off) are set in the product editor (Productos).
export default async function AdminPromosPage() {
  const [codes, tiers] = await Promise.all([
    listDiscountCodes(),
    listQuantityDiscounts(),
  ]);

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Ventas
      </h1>
      <SubTabs tabs={VENTAS_TABS} />
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Promociones
      </h2>

      <div className="mb-5 rounded-lg border border-line bg-cream/40 p-4 text-sm leading-6 text-muted">
        Son cuatro cosas distintas:{" "}
        <span className="font-bold text-ink">Oferta del producto</span> (badge 2x1/3x2
        o % off propio de un producto, se carga en Productos),{" "}
        <span className="font-bold text-ink">Descuento por cantidad de unidades</span>{" "}
        (regla por volumen del pedido),{" "}
        <span className="font-bold text-ink">Cupón de descuento</span> (código que
        escribe el cliente en el checkout) y{" "}
        <span className="font-bold text-ink">Descuento por forma de pago</span>{" "}
        (efectivo/transferencia, en Configuración → Métodos de pago).
      </div>

      <PromosTabs
        codes={
          <div>
            <p className="mb-4 text-sm text-muted">
              Cupones de descuento que el cliente escribe en el checkout. La
              oferta del producto (2x1, 3x2 o % off) se configura en cada
              producto, en <span className="font-bold text-ink">Productos</span>.
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
        }
        cantidad={<QuantityDiscountManager tiers={tiers} />}
      />
    </div>
  );
}
