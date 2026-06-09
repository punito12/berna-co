import Hero from "@/components/Hero";
import Ingredients from "@/components/Ingredients";
import Catalog from "@/components/Catalog";
import PointsOfSale from "@/components/PointsOfSale";
import Footer from "@/components/Footer";
import WhatsappFloat from "@/components/WhatsappFloat";
import QuantityDiscountBanner from "@/components/QuantityDiscountBanner";
import { getAvailableProducts } from "@/lib/products";
import { getPaymentConfig } from "@/lib/payment-config";
import {
  loadCmsBundle,
  getSiteText,
  getSiteImage,
  getSections,
  getThemeColors,
  themeToCssVars,
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

  const preview = isCmsPreviewRequest(searchParams?.preview);
  const t = (key: string, fb: string) => getSiteText(cms, key, fb, preview);
  const image = (key: string, fb: string) => getSiteImage(cms, key, fb, preview);
  const sections = getSections(cms, "home", preview);
  const previewCssVars = preview ? themeToCssVars(getThemeColors(cms, true)) : "";

  // Renders one section by its key. Unknown/footer keys are skipped (footer is
  // rendered separately, always last).
  function renderSection(key: string) {
    switch (key) {
      case "home.hero":
        return (
          <Hero
            key={key}
            title={t("home.hero.title", "Milanesas\nPremium")}
            subtitle={t("home.hero.subtitle", "de nuestra cocina a tu freezer")}
            cta={t("home.hero.cta", "Ver productos")}
            backgroundUrl={image("home.hero.background", "/images/hero.jpg")}
          />
        );
      case "home.ingredients":
        return (
          <Ingredients
            key={key}
            eyebrow={t("home.ingredients.eyebrow", "Lo que hay adentro")}
            title={t("home.ingredients.title", "Nuestros ingredientes")}
            item1={t("home.ingredients.item1", "Huevos de gallinas libres")}
            item2={t("home.ingredients.item2", "Pollo pastoril")}
            item3={t("home.ingredients.item3", "Peceto de pastura")}
          />
        );
      case "home.products":
        return products.length > 0 ? (
          <Catalog
            key={key}
            products={products}
            efectivoPct={payCfg.efectivoDiscountPercent}
            transferenciaPct={payCfg.transferenciaDiscountPercent}
            eyebrow={t("catalogo.eyebrow", "Congelados Caseros")}
            title={t("catalogo.title", "Nuestros productos")}
            subtitle={t(
              "catalogo.subtitle",
              "Elegí tu corte y tu empanado. Listas para el horno."
            )}
            allLabel={t("catalogo.filter.all", "Todos")}
            outOfStockLabel={t("catalogo.outOfStock", "Sin stock")}
          />
        ) : (
          <section key={key} className="bg-cream px-4 py-24 text-center">
            <p className="font-bold uppercase tracking-wide text-muted">
              {t("catalogo.empty", "No hay productos cargados todavía.")}
            </p>
          </section>
        );
      case "home.pos":
        return (
          <PointsOfSale
            key={key}
            eyebrow={t("home.pos.eyebrow", "Dónde encontrarnos")}
            title={t("home.pos.title", "Puntos de venta")}
            subtitle={t(
              "home.pos.subtitle",
              "Conseguí nuestros productos en estos locales."
            )}
          />
        );
      default:
        return null; // home.footer handled below
    }
  }

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
      {sections.map((s) => renderSection(s.key))}
      <Footer
        slogan={t("footer.slogan", "¡La vida es rica!")}
        instagram={t("footer.instagram", "@berna.and.co")}
        instagramUrl={t("footer.instagramUrl", "https://instagram.com/berna.and.co")}
        email={t("footer.email", "csberna2020@gmail.com")}
        whatsapp={t("footer.whatsapp", "+54 11 2545-0304")}
      />
      <WhatsappFloat />
    </main>
  );
}
