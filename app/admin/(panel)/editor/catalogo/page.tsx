import { listTextsByCategory } from "@/lib/cms-admin";
import { humanizeCmsKey } from "@/lib/cms-labels";
import { CATALOG_CMS_LABELS } from "@/lib/catalog-cms-labels";
import { ensureCatalogCmsLabels } from "@/lib/cms-catalog-texts";
import CmsTextField from "@/components/CmsTextField";

const ECOMMERCE_LABEL_GROUPS = [
  {
    id: "payment",
    title: "Etiquetas de formas de pago",
    description: "Etiquetas cortas que aparecen en las tarjetas de producto.",
  },
  {
    id: "cart",
    title: "Botones y carrito",
    description: "Textos de la barra del carrito y sus acciones principales.",
  },
  {
    id: "stock",
    title: "Mensajes de stock",
    description: "Avisos que ayudan al cliente cuando quedan pocas unidades.",
  },
  {
    id: "detail",
    title: "Detalle de producto",
    description: "Textos del selector, estado y llamados a ver más información.",
  },
] as const;

// Human labels for the catalog text keys.
const LABELS: Record<string, string> = {
  "catalogo.eyebrow": "Bajada (arriba del título)",
  "catalogo.title": "Título",
  "catalogo.subtitle": "Subtítulo",
  "catalogo.filter.all": "Filtro · Todos",
  "catalogo.outOfStock": "Mensaje sin stock",
  "catalogo.empty": "Mensaje catálogo vacío",
  ...Object.fromEntries(CATALOG_CMS_LABELS.map((label) => [label.key, label.label])),
};

function isStyleLockedLabel(key: string) {
  return (
    key.startsWith("catalog.product.") ||
    key.startsWith("catalog.cart.") ||
    key.startsWith("catalog.badge.") ||
    key.startsWith("catalog.filter.") ||
    key === "catalogo.filter.all" ||
    key === "catalogo.outOfStock"
  );
}

export default async function EditorCatalogoPage() {
  await ensureCatalogCmsLabels();
  const texts = await listTextsByCategory("catalogo");
  const textByKey = new Map(texts.map((text) => [text.key, text]));
  const ecommerceLabelKeys = new Set(CATALOG_CMS_LABELS.map((label) => label.key));
  const generalTexts = texts.filter((text) => !ecommerceLabelKeys.has(text.key));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Catálogo público
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Productos
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Editá los textos generales que acompañan la grilla. Los cambios se
            guardan como borrador hasta que publiques.
          </p>
        </div>
        <div className="mb-5 rounded-xl border border-line bg-cream/35 p-4 text-sm leading-6 text-muted">
          Los nombres, precios, stock e imágenes reales de los productos se
          editan en <span className="font-bold text-ink">Admin → Productos</span>.
          Esta sección solo cambia los textos visibles del catálogo.
        </div>
        <div className="grid gap-3">
          {generalTexts.map((t) => (
            <CmsTextField
              key={t.key}
              textKey={t.key}
              label={LABELS[t.key] ?? humanizeCmsKey(t.key)}
              published={t.value}
              draft={t.valueDraft}
              style={t.style}
              styleDraft={t.styleDraft}
              maxLength={t.maxLength}
              multiline={t.maxLength > 80}
              allowStyle={!isStyleLockedLabel(t.key)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-5 border-b border-line pb-4">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
            Ecommerce
          </p>
          <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
            Textos de cards y carrito
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Estos labels se repiten en productos, chips de pago, carrito y
            detalle. Mantienen el diseño fijo para que la compra siga clara.
          </p>
        </div>
        <div className="space-y-6">
          {ECOMMERCE_LABEL_GROUPS.map((group) => {
            const groupLabels = CATALOG_CMS_LABELS.filter(
              (label) => label.group === group.id
            );
            return (
              <section
                key={group.id}
                className="rounded-xl border border-line bg-cream/30 p-4"
              >
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black uppercase tracking-wide text-sm text-ink">
                      {group.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {group.description}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-line bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                    {groupLabels.length} campos
                  </span>
                </div>
                <div className="grid gap-3">
                  {groupLabels.map((label) => {
                    const text = textByKey.get(label.key);
                    if (!text) return null;
                    return (
                      <CmsTextField
                        key={text.key}
                        textKey={text.key}
                        label={label.label}
                        published={text.value}
                        draft={text.valueDraft}
                        style={text.style}
                        styleDraft={text.styleDraft}
                        maxLength={text.maxLength}
                        multiline={text.maxLength > 80}
                        allowStyle={false}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
