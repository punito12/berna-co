import Link from "next/link";
import { listSuppliers, COMPRAS_TABS } from "@/lib/suppliers";
import { listPurchases } from "@/lib/purchases";
import PurchaseForm from "@/components/PurchaseForm";
import PurchaseRow from "@/components/PurchaseRow";
import SubTabs from "@/components/SubTabs";

// Compras → Órdenes de compra: load a purchase + recent purchases list.
export default async function OrdenesDeCompraPage() {
  const [suppliers, purchases] = await Promise.all([
    listSuppliers(),
    listPurchases(50),
  ]);

  const dateFmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Compras
      </h1>
      <SubTabs tabs={COMPRAS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Cargar compra
      </h2>

      {suppliers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-muted">
          Primero cargá un proveedor en{" "}
          <Link
            href="/admin/compras/proveedores"
            className="font-bold text-ink underline"
          >
            Proveedores
          </Link>
          .
        </p>
      ) : (
        <PurchaseForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        />
      )}

      <h2 className="mb-3 mt-10 font-black uppercase tracking-tight text-xl text-ink">
        Compras recientes
      </h2>
      {purchases.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-10 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no cargaste compras.
        </p>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <PurchaseRow
              key={p.id}
              purchase={{
                id: p.id,
                date: dateFmt.format(p.date),
                supplierName: p.supplierName,
                itemsCount: p.itemsCount,
                total: p.total,
                balance: p.balance,
                paymentStatus: p.paymentStatus,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
