import { NextResponse } from "next/server";
import {
  loadCmsBundle,
  getSiteText,
  isPreview,
  textStylesToCss,
} from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";

// Public: returns the published CMS texts for a category (e.g. ?category=checkout),
// so client components (checkout) can read them. Falls back to {} on error.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "";
  const preview =
    (await isPreview()) || isCmsPreviewRequest(url.searchParams.get("preview"));
  try {
    const bundle = await loadCmsBundle();
    const out: Record<string, string> = {};
    // We don't expose category metadata in the bundle map, so filter by prefix:
    // checkout.* / footer.* etc. Callers pass the prefix as `category`.
    for (const [key] of bundle.texts) {
      if (!category || key.startsWith(`${category}.`)) {
        out[key] = getSiteText(bundle, key, "", preview);
      }
    }
    return NextResponse.json({ texts: out, textStylesCss: textStylesToCss(bundle, preview) });
  } catch {
    return NextResponse.json({ texts: {}, textStylesCss: "" });
  }
}
