import Link from "next/link";
import { notFound } from "next/navigation";
import PresupuestoForm from "@/components/PresupuestoForm";
import {
  getPresupuesto,
  listPresupuestoProductOptions,
} from "@/lib/presupuestos";

export const dynamic = "force-dynamic";

function dateInput(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function EditarPresupuestoPage({
  params,
}: {
  params: { id: string };
}) {
  const [presupuesto, products] = await Promise.all([
    getPresupuesto(params.id),
    listPresupuestoProductOptions(),
  ]);
  if (!presupuesto) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/operaciones/presupuestos"
        className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-muted hover:text-ink"
      >
        ‹ Volver a presupuestos
      </Link>
      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        Editar presupuesto
      </h1>
      <PresupuestoForm
        products={products}
        initial={{
          id: presupuesto.id,
          type: presupuesto.type as "PRICE_LIST" | "QUOTATION",
          customerName: presupuesto.customerName,
          customerId: presupuesto.customerId,
          date: dateInput(presupuesto.date),
          validUntil: dateInput(presupuesto.validUntil),
          discountPercent: String(presupuesto.discountPercent),
          notesInternal: presupuesto.notesInternal,
          items: presupuesto.items.map((it) => ({
            productId: it.productId,
            breadcrumbType: it.breadcrumbType,
            productName: it.productName,
            variantName: it.variantName,
            listPrice: it.listPrice,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        }}
      />
    </div>
  );
}
