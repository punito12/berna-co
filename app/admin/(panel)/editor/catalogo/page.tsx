import { listTextsByCategory } from "@/lib/cms-admin";
import CmsTextField from "@/components/CmsTextField";

// Human labels for the catalog text keys.
const LABELS: Record<string, string> = {
  "catalogo.eyebrow": "Bajada (arriba del título)",
  "catalogo.title": "Título",
  "catalogo.subtitle": "Subtítulo",
  "catalogo.filter.all": "Filtro · Todos",
  "catalogo.outOfStock": "Mensaje sin stock",
  "catalogo.empty": "Mensaje catálogo vacío",
};

export default async function EditorCatalogoPage() {
  const texts = await listTextsByCategory("catalogo");
  return (
    <div>
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Textos del catálogo
      </h2>
      <div className="space-y-3">
        {texts.map((t) => (
          <CmsTextField
            key={t.key}
            textKey={t.key}
            label={LABELS[t.key] ?? t.key}
            published={t.value}
            draft={t.valueDraft}
            maxLength={t.maxLength}
            multiline={t.maxLength > 80}
          />
        ))}
      </div>
    </div>
  );
}
