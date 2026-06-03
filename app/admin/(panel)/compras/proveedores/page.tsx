import { listSuppliers, COMPRAS_TABS } from "@/lib/suppliers";
import SupplierManager from "@/components/SupplierManager";
import SubTabs from "@/components/SubTabs";

// Compras → Proveedores: CRUD list of suppliers.
export default async function ProveedoresPage() {
  const suppliers = await listSuppliers();
  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Compras
      </h1>
      <SubTabs tabs={COMPRAS_TABS} />
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Proveedores
      </h2>
      <SupplierManager
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          contact: s.contact,
          notes: s.notes,
          defaultDueDays: s.defaultDueDays,
        }))}
      />
    </div>
  );
}
