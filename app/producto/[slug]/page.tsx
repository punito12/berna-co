import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";
import HomeHeader from "@/components/HomeHeader";
import CmsFooter from "@/components/CmsFooter";
import WhatsappFloat from "@/components/WhatsappFloat";
import CartOverlay from "@/components/CartOverlay";
import {
  getLogo,
  getSiteText,
  getThemeColors,
  isPreview,
  loadCmsBundle,
  textStylesToCss,
  themeToCssVars,
} from "@/lib/cms";
import {
  getStyleSettings,
  styleSettingsToCssVars,
} from "@/lib/cms-style-settings";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo";

// El producto, stock y contenido CMS deben resolverse en runtime, no durante el
// prerender del build (que puede saturar el pool de Neon).
export const dynamic = "force-dynamic";

// Per-product page title for nicer browser tabs / sharing.
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Producto no encontrado" };
  const title = product.name;
  const socialTitle = `${product.name} | ${SITE_NAME}`;
  const description =
    product.description ||
    `${product.name} de Berna&co. Producto premium disponible para comprar online.`;
  const image =
    product.imagesByBreadcrumb[product.breadcrumbs[0] ?? "TRADITIONAL"]?.[0] ||
    product.imageUrl ||
    DEFAULT_OG_IMAGE;
  const imageUrl = image.startsWith("http") ? image : absoluteUrl(image);
  return {
    title,
    description,
    alternates: {
      canonical: `/producto/${product.slug}`,
    },
    openGraph: {
      type: "website",
      url: absoluteUrl(`/producto/${product.slug}`),
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${product.name} - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { preview?: string };
}) {
  const [product, cms] = await Promise.all([
    getProductBySlug(params.slug),
    loadCmsBundle(),
  ]);
  if (!product) notFound();
  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams?.preview);
  const logoUrl = getLogo(cms, preview);
  // En preview, los colores/estilos publicados ya vienen del layout; acá
  // inyectamos los valores de BORRADOR (incluida la fuente de las descripciones,
  // --description-font) para que el cambio se vea en la vista previa del editor
  // ANTES de publicar. Fuera de preview esto queda vacío y no cambia nada.
  const previewCssVars = preview
    ? [
        themeToCssVars(getThemeColors(cms, true)),
        styleSettingsToCssVars(getStyleSettings(cms, true)),
      ]
        .filter(Boolean)
        .join(";")
    : "";
  const previewTextCss = preview ? textStylesToCss(cms, true) : "";
  const productLabels = {
    backToProducts: getSiteText(cms, "catalog.page_title", "productos", preview),
    chooseBreadcrumb: getSiteText(
      cms,
      "catalog.product.breadcrumb_label",
      getSiteText(cms, "catalog.product.choose_breadcrumb", "Empanado", preview),
      preview
    ),
    addToCart: getSiteText(
      cms,
      "catalog.product.add_to_cart",
      "Agregar al carrito",
      preview
    ),
    outOfStock: getSiteText(
      cms,
      "catalog.product.out_of_stock_label_detail",
      getSiteText(cms, "catalog.product.out_of_stock", "Sin stock", preview),
      preview
    ),
    lowStock: getSiteText(
      cms,
      "catalog.product.low_stock_label",
      "Solo quedan {count} disponibles",
      preview
    ),
    addedDetail: getSiteText(
      cms,
      "catalog.product.added_detail_label",
      "Agregado al carrito ✓",
      preview
    ),
  };
  const cartLabel = cms.texts.has("checkout.cart_label")
    ? getSiteText(cms, "checkout.cart_label", "Carrito", preview)
    : "Carrito";

  return (
    <main className="min-h-screen bg-cream" data-cms-page="product-detail">
      {previewCssVars && (
        <style
          dangerouslySetInnerHTML={{ __html: `:root{${previewCssVars}}` }}
        />
      )}
      {previewTextCss && (
        <style dangerouslySetInnerHTML={{ __html: previewTextCss }} />
      )}
      {/* Mismo header que el home (variante visible al tope de la página) */}
      <HomeHeader variant="page" />

      {/* pt alto: el header flotante es fixed y no empuja el contenido. */}
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-24 sm:pb-12 sm:pt-28">
        <Link
          href="/#productos"
          data-cms-section="product.back"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white/85 px-5 py-2 font-bold uppercase tracking-widest text-xs text-ink shadow-[0_8px_25px_rgba(10,10,10,0.08)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95 sm:mb-7"
        >
          ‹ Volver a {productLabels.backToProducts.toLowerCase()}
        </Link>

        <ProductDetail product={product} labels={productLabels} />
      </div>

      <CmsFooter preview={preview} />
      <WhatsappFloat />
      {/* Carrito flotante CRAV-style (desktop): FAB + blur + panel esquina. */}
      <CartOverlay />
    </main>
  );
}
