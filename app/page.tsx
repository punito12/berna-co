import WhatsappFloat from "@/components/WhatsappFloat";
import CartOverlay from "@/components/CartOverlay";
import CmsHomeSection from "@/components/CmsHomeSection";
import HomeHeader from "@/components/HomeHeader";
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
import { loadHomeData } from "@/lib/home-data";

// La home depende de CMS, productos y configuración vivos. El loader publicado
// ya tiene su propia cache; evitar que Next abra conexiones a Neon al prerender.
export const dynamic = "force-dynamic";

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
  const preview =
    (await isPreview()) || isCmsPreviewRequest(searchParams?.preview);

  // Sin preview: datos PUBLICADOS desde la cache (sin esperar a la DB en cada
  // request → LCP más rápido). En preview: datos frescos para ver los borradores.
  const { products, payCfg, cms } = preview
    ? {
        products: await getAvailableProducts(),
        payCfg: await getPaymentConfig(),
        cms: await loadCmsBundle(),
      }
    : await loadHomeData();

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
      {/* Header liquid glass: aparece deslizándose al scrollear pasado el hero. */}
      <HomeHeader />

      {/* El banner de descuento por cantidad se movió fuera de la home; va a
          reaparecer en carrito y checkout (pendiente). */}
      {/* Efecto de paneles: el hero (sticky top-0 z-0 en el propio componente)
          queda pinneado y el resto de las secciones va en una capa z-10 opaca
          que se desliza por encima al scrollear. Si el CMS moviera/ocultara el
          hero, se cae con gracia al flujo plano. */}
      {(() => {
        const heroIndex = sections.findIndex(
          (s) => s.key === "home.hero" || s.type === "hero"
        );
        const heroSection = heroIndex >= 0 ? sections[heroIndex] : null;
        const rest =
          heroIndex >= 0
            ? sections.filter((_, i) => i !== heroIndex)
            : sections;
        const renderSection = (section: (typeof sections)[number]) => (
          <CmsHomeSection
            key={section.key}
            section={section}
            cms={cms}
            preview={preview}
            previewToken={searchParams?.preview}
            products={products}
            payCfg={payCfg}
          />
        );
        return (
          <>
            {heroSection && renderSection(heroSection)}
            <div className="relative z-10 bg-[color:var(--color-bg,#ffffff)]">
              {rest.map(renderSection)}
            </div>
          </>
        );
      })()}
      <WhatsappFloat />
      {/* Carrito flotante CRAV-style (desktop): FAB + blur + panel esquina. */}
      <CartOverlay />
    </main>
  );
}
