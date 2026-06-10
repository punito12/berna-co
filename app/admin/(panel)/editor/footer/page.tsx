import { listTextsByCategory } from "@/lib/cms-admin";
import CmsTextField from "@/components/CmsTextField";

const LABELS: Record<string, string> = {
  "footer.slogan": "Slogan",
  "footer.instagram": "Instagram · texto",
  "footer.instagramUrl": "Instagram · URL",
  "footer.email": "Email de contacto",
  "footer.whatsapp": "WhatsApp",
  "footer.copyright": "Copyright",
  "legal.terms": "Términos y condiciones",
  "legal.privacy": "Política de privacidad",
};

export default async function EditorFooterPage() {
  const [footer, legal] = await Promise.all([
    listTextsByCategory("footer"),
    listTextsByCategory("legal"),
  ]);
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
              label={LABELS[t.key] ?? t.key}
              published={t.value}
              draft={t.valueDraft}
              style={t.style}
              styleDraft={t.styleDraft}
              maxLength={t.maxLength}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
          Páginas legales
        </h2>
        <div className="space-y-3">
          {legal.map((t) => (
            <CmsTextField
              key={t.key}
              textKey={t.key}
              label={LABELS[t.key] ?? t.key}
              published={t.value}
              draft={t.valueDraft}
              style={t.style}
              styleDraft={t.styleDraft}
              maxLength={t.maxLength}
              multiline
            />
          ))}
        </div>
      </section>
    </div>
  );
}
