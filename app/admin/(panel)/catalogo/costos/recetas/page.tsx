import { COSTOS_TABS } from "@/lib/pricing";
import { listRecipes } from "@/lib/recipes";
import { listProductsWithBreadcrumbs } from "@/lib/stock-ops";
import SubTabs from "@/components/SubTabs";
import RecipeManager from "@/components/RecipeManager";

// Catálogo → Costos y Precios (Tab 3): recipes per product+empanado.
export default async function RecetasPage() {
  const [recipes, products] = await Promise.all([
    listRecipes(),
    listProductsWithBreadcrumbs(),
  ]);

  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Costos y Precios
      </h1>
      <SubTabs tabs={COSTOS_TABS} />
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Recetas
      </h2>
      <p className="mb-5 text-sm text-muted">
        Definí ingredientes y packaging por producto y empanado. El costo se
        calcula solo. Si activás “usar para calcular el costo”, ese costo manda
        en la tabla maestra.
      </p>
      <RecipeManager
        recipes={recipes}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          breadcrumbs: p.breadcrumbs,
        }))}
      />
    </div>
  );
}
