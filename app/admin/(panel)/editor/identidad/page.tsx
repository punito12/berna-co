import { getSiteContentAdmin } from "@/lib/cms-admin";
import { DEFAULT_THEME, DEFAULT_TYPOGRAPHY } from "@/lib/cms";
import IdentityEditor from "@/components/IdentityEditor";

function parse<T>(raw: string, fb: T): T {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? { ...fb, ...v } : fb;
  } catch {
    return fb;
  }
}

export default async function EditorIdentidadPage() {
  const content = await getSiteContentAdmin();
  return (
    <div>
      <h2 className="mb-4 font-black uppercase tracking-tight text-xl text-ink">
        Identidad visual
      </h2>
      <IdentityEditor
        colorsDraft={parse(content.themeColorsDraft, DEFAULT_THEME)}
        typographyDraft={parse(content.typographyDraft, DEFAULT_TYPOGRAPHY)}
        logoDraft={content.logoUrlDraft}
      />
    </div>
  );
}
