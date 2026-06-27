import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import PresupuestoSheet from "@/components/PresupuestoSheet";
import { getPresupuesto, padPresupuestoNumber } from "@/lib/presupuestos";

// Presupuesto imprimible. El maquetado vive en <PresupuestoSheet>. Los controles
// quedan fuera del área imprimible con print:hidden.
export default async function ImprimirPresupuestoPage({
  params,
}: {
  params: { id: string };
}) {
  const p = await getPresupuesto(params.id);
  if (!p) notFound();

  const sheet = {
    type: p.type as "PRICE_LIST" | "QUOTATION",
    number: p.number,
    date: p.date,
    validUntil: p.validUntil,
    customerName: p.customerName,
    total: p.total,
    items: p.items.map((it) => ({
      id: it.id,
      // Descripción = nombre + empanado (snapshot).
      description: it.variantName
        ? `${it.productName} — ${it.variantName}`
        : it.productName,
      listPrice: it.listPrice,
      wholesalePrice: it.wholesalePrice,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
    })),
  };

  return (
    <div className="mx-auto max-w-[210mm]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/operaciones/presupuestos"
          className="text-xs font-bold uppercase tracking-widest text-muted hover:text-ink"
        >
          ‹ Volver a presupuestos
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/operaciones/presupuestos/${p.id}/editar`}
            className="border border-line px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            Editar
          </Link>
          <PrintButton
            documentTitle={`Presupuesto ${padPresupuestoNumber(p.number)} - Berna&co`}
          />
        </div>
      </div>

      <p className="mb-4 text-[11px] text-muted print:hidden">
        Al tocar <strong>Imprimir / Descargar PDF</strong> se abre el diálogo del
        navegador: elegí <strong>“Guardar como PDF”</strong> como destino. Sale
        solo el presupuesto, en una hoja A4.
      </p>

      <PresupuestoSheet data={sheet} />
    </div>
  );
}
