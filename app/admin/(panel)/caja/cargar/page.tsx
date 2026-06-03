import SubTabs from "@/components/SubTabs";
import { CAJA_TABS } from "../page";
import CashForms from "@/components/CashForms";
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from "@/lib/cash";

// Caja — Cargar: forms to add a manual income or an expense.
export default function CajaCargarPage() {
  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Caja
      </h1>
      <SubTabs tabs={CAJA_TABS} />
      <CashForms
        categories={[...EXPENSE_CATEGORIES]}
        sources={[...INCOME_SOURCES]}
      />
    </div>
  );
}
