import { listTextsByCategory } from "@/lib/cms-admin";
import { humanizeCmsKey } from "@/lib/cms-labels";
import CmsTextField from "@/components/CmsTextField";

const LABELS: Record<string, string> = {
  "footer.slogan": "Slogan",
  "footer.instagram": "Instagram · texto",
  "footer.instagramUrl": "Instagram · URL",
  "footer.email": "Email de contacto",
  "footer.whatsapp": "WhatsApp",
  "footer.copyright": "Copyright",
};

// Nota: las páginas legales (/terminos, /privacidad, /envios,
// /cambios-devoluciones) hoy son contenido fijo en código y NO leen del CMS.
// Por eso no se muestran acá: evitamos campos que parezcan editables sin serlo.
// La conexión real de las legales al CMS queda para una tarea P1.
export default async function EditorFooterPage() {
  const footer = await listTextsByCategory("footer");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Footer y contacto
        </h2>
        <div className="space-y-3">
          {footer.map((t) => (
            <CmsTextField
              key={t.key}
              textKey={t.key}
              label={LABELS[t.key] ?? humanizeCmsKey(t.key)}
              published={t.value}
              draft={t.valueDraft}
              style={t.style}
              styleDraft={t.styleDraft}
              maxLength={t.maxLength}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
