import { getSiteContentAdmin } from "@/lib/cms-admin";
import { DEFAULT_THEME, DEFAULT_TYPOGRAPHY } from "@/lib/cms";
import { sanitizeStyleSettings } from "@/lib/cms-style-settings";
import IdentityEditor from "@/components/IdentityEditor";

function parse<T>(raw: string, fb: T): T {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? { ...fb, ...v } : fb;
  } catch {
    return fb;
  }
}

// The non-color style settings live under typography.styles.
function parseStyles(raw: string) {
  try {
    const v = JSON.parse(raw);
    return sanitizeStyleSettings(
      v && typeof v === "object" ? (v as Record<string, unknown>).styles : {}
    );
  } catch {
    return sanitizeStyleSettings({});
  }
}

export default async function EditorIdentidadPage() {
  const content = await getSiteContentAdmin();
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Identidad visual
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Marca y estilos
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Ajustá colores, tipografía y logo global. Los cambios se guardan
            como borrador hasta que publiques.
          </p>
        </div>
      </section>
      <IdentityEditor
        colorsDraft={parse(content.themeColorsDraft, DEFAULT_THEME)}
        typographyDraft={parse(content.typographyDraft, DEFAULT_TYPOGRAPHY)}
        styleSettingsDraft={parseStyles(content.typographyDraft)}
        logoDraft={content.logoUrlDraft}
      />
    </div>
  );
}
