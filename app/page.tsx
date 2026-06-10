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
  isPreview,
} from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";

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
  const previewCssVars = preview ? themeToCssVars(getThemeColors(cms, true)) : "";

  return (
    <main>
      {previewCssVars && (
        <style
          dangerouslySetInnerHTML={{ __html: `:root{${previewCssVars}}` }}
        />
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
          products={products}
          payCfg={payCfg}
        />
      ))}
      <WhatsappFloat />
    </main>
  );
}
