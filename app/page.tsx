import WhatsappFloat from "@/components/WhatsappFloat";
import QuantityDiscountBanner from "@/components/QuantityDiscountBanner";
import CmsHomeSection from "@/components/CmsHomeSection";
import { getAvailableProducts } from "@/lib/products";
import { getPaymentConfig } from "@/lib/payment-config";
import {
  loadCmsBundle,
  getSections,
  getThemeColors,
  themeToCssVars,
  textStylesToCss,
  isPreview,
} from "@/lib/cms";
import {
  getStyleSettings,
  styleSettingsToCssVars,
} from "@/lib/cms-style-settings";
import { getGlobalSeo, getPageSeo } from "@/lib/cms-seo";
import type { Metadata } from "next";
import { isCmsPreviewRequest } from "@/lib/cms-preview";

// Home metadata from the CMS (seo.home.*), falling back to the global SEO.
export async function generateMetadata(): Promise<Metadata> {
  try {
    const bundle = await loadCmsBundle();
    const global = getGlobalSeo(bundle);
    const page = getPageSeo(bundle, "home", global.title, global.description);
    // `absolute` so the layout's "%s | Berna&co" template isn't appended to the
    // already-complete home title.
    return { title: { absolute: page.title }, description: page.description };
  } catch {
    return {};
  }
}

// Home page. Sections render in the order/visibility configured in the CMS
// (SiteSection); each section's texts/images come from the CMS too, with the
// original hardcoded strings as fallbacks. The footer is always rendered last.
export default async function HomePage({
  searchParams,
}: {
  searchParams?: { preview?: string };
}) {
  const [products, payCfg, cms] = await Promise.all([
    getAvailableProducts(),
    getPaymentConfig(),
    loadCmsBundle(),
  ]);

  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams?.preview);
  const sections = getSections(cms, "home", preview);
  const previewCssVars = preview
    ? [
        themeToCssVars(getThemeColors(cms, true)),
        styleSettingsToCssVars(getStyleSettings(cms, true)),
      ]
        .filter(Boolean)
        .join(";")
    : "";
  const previewTextCss = preview ? textStylesToCss(cms, true) : "";

  return (
    <main data-cms-page="home">
      {previewCssVars && (
        <style
          dangerouslySetInnerHTML={{ __html: `:root{${previewCssVars}}` }}
        />
      )}
      {previewTextCss && (
        <style dangerouslySetInnerHTML={{ __html: previewTextCss }} />
      )}
      {preview && (
        <div className="fixed left-4 top-4 z-50 rounded bg-amber-400 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-black shadow">
          Preview CMS
        </div>
      )}
      <QuantityDiscountBanner />
      {sections.map((section) => (
        <CmsHomeSection
          key={section.key}
          section={section}
          cms={cms}
          preview={preview}
          previewToken={searchParams?.preview}
          products={products}
          payCfg={payCfg}
        />
      ))}
      <WhatsappFloat />
    </main>
  );
}
