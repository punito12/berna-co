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
  "footer.tagline": "Texto heredado · frase",
  "footer.contact.title": "Texto heredado · título contacto",
  "footer.contact.whatsapp_label": "Texto heredado · etiqueta WhatsApp",
  "footer.contact.email_label": "Texto heredado · etiqueta email",
  "footer.contact.instagram_label": "Texto heredado · etiqueta Instagram",
  "footer.legal.copyright": "Texto heredado · copyright",
  "footer.legal.terms_link": "Texto heredado · link términos",
  "footer.legal.privacy_link": "Texto heredado · link privacidad",
};

const FIELD_GROUPS = [
  {
    id: "brand",
    title: "Marca en el footer",
    description: "Frase principal y texto final de derechos.",
    keys: ["footer.slogan", "footer.copyright"],
  },
  {
    id: "contact",
    title: "Contacto y redes",
    description: "Datos visibles para que el cliente pueda escribir o seguir la marca.",
    keys: [
      "footer.instagram",
      "footer.instagramUrl",
      "footer.email",
      "footer.whatsapp",
    ],
  },
] as const;

type FooterText = Awaited<ReturnType<typeof listTextsByCategory>>[number];

function isFooterText(text: FooterText | undefined): text is FooterText {
  return Boolean(text);
}

// Nota: las páginas legales (/terminos, /privacidad, /envios,
// /cambios-devoluciones) hoy son contenido fijo en código y NO leen del CMS.
// Por eso no se muestran acá: evitamos campos que parezcan editables sin serlo.
// La conexión real de las legales al CMS queda para una tarea P1.
export default async function EditorFooterPage() {
  const footer = await listTextsByCategory("footer");
  const byKey = new Map(footer.map((text) => [text.key, text]));
  const groupedKeys = new Set<string>(FIELD_GROUPS.flatMap((group) => group.keys));
  const legacyTexts = footer.filter((text) => !groupedKeys.has(text.key));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Contacto público
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Pie de página
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Editá los datos de contacto y textos visibles al final del sitio.
            Los links legales se administran desde la sección Legales.
          </p>
        </div>
      </section>

      {FIELD_GROUPS.map((group) => {
        const groupTexts = group.keys
          .map((key) => byKey.get(key))
          .filter(isFooterText);
        if (groupTexts.length === 0) return null;
        return (
          <section
            key={group.id}
            className="rounded-2xl border border-line bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-black uppercase tracking-tight text-lg text-ink">
                  {group.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {group.description}
                </p>
              </div>
              <span className="w-fit rounded-full border border-line bg-cream px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                {groupTexts.length} campos
              </span>
            </div>
            <div className="grid gap-3">
              {groupTexts.map((t) => (
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
        );
      })}

      {legacyTexts.length > 0 && (
        <details className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <summary className="cursor-pointer font-black uppercase tracking-tight text-lg text-ink">
            Campos heredados
          </summary>
          <p className="mt-2 text-sm leading-6 text-muted">
            Estos textos vienen de versiones anteriores del CMS. Se conservan
            para compatibilidad, pero pueden no verse en el footer actual.
          </p>
          <div className="mt-4 grid gap-3">
            {legacyTexts.map((t) => (
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
        </details>
      )}
    </div>
  );
}
