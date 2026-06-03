import Link from "next/link";
import { notFound } from "next/navigation";
import { getSaleDetail, type SaleKind } from "@/lib/sales-detail";
import { listProductsForSale } from "@/lib/management";
import SaleEditor from "@/components/SaleEditor";

// Edit screen for a web order or manual sale. Items + editable fields; the
// server reconciles stock by the difference and recomputes totals.
export default async function SaleEditPage({
  params,
}: {
  params: { kind: string; id: string };
}) {
  const kind: SaleKind | null =
    params.kind === "order" ? "ORDER" : params.kind === "sale" ? "MANUAL" : null;
  if (!kind) notFound();

  const [sale, products] = await Promise.all([
    getSaleDetail(kind, params.id),
    listProductsForSale(),
  ]);
  if (!sale) notFound();
  if (sale.status === "CANCELLED") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center text-sm text-muted">
          Este pedido está cancelado y no se puede editar.
        </p>
      </div>
    );
  }

  const backHref = `/admin/operaciones/ventas/${params.kind}/${params.id}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={backHref}
        className="mb-4 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
      >
        ‹ Volver al detalle
      </Link>
      <h1 className="mb-6 font-black uppercase tracking-tight text-3xl text-ink">
        Editar #{sale.shortId}
      </h1>
      <SaleEditor
        kind={sale.kind}
        id={sale.id}
        backHref={backHref}
        initial={{
          customerName: sale.customerName,
          customerPhone: sale.customerPhone ?? "",
          address: sale.address ?? "",
          scheduledDate: sale.scheduledDate
            ? sale.scheduledDate.toISOString().slice(0, 10)
            : "",
          scheduledSlot: sale.scheduledSlot ?? "",
          notes: sale.notes ?? "",
          deliveryType: sale.deliveryType,
          items: sale.items.map((it) => ({
            productId: it.productId ?? "",
            productName: it.productName,
            breadcrumbType: it.breadcrumbType ?? "",
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
          })),
        }}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          breadcrumbs: p.breadcrumbs,
          prices: p.prices,
        }))}
      />
    </div>
  );
}
