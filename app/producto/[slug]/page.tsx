import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";
import QuantityDiscountBanner from "@/components/QuantityDiscountBanner";
import SiteHeader from "@/components/SiteHeader";
import CmsFooter from "@/components/CmsFooter";
import WhatsappFloat from "@/components/WhatsappFloat";
import { getLogo, getSiteText, isPreview, loadCmsBundle } from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo";

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
    <main className="min-h-screen bg-cream">
      <QuantityDiscountBanner />
      <SiteHeader
        logoUrl={logoUrl}
        productsLabel={getSiteText(cms, "catalog.page_title", "Productos", preview)}
        cartLabel={cartLabel}
      />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:py-12">
        <Link
          href="/#productos"
          className="mb-4 inline-flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-muted transition-colors hover:text-ink sm:mb-6"
        >
          ‹ Volver a {productLabels.backToProducts.toLowerCase()}
        </Link>

        <ProductDetail product={product} labels={productLabels} />
      </div>

      <CmsFooter preview={preview} />
      <WhatsappFloat />
    </main>
  );
}
