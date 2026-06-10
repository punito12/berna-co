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

// Per-product page title for nicer browser tabs / sharing.
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Producto no encontrado — Berna&co" };
  return {
    title: `${product.name} — Berna&co`,
    description: product.description,
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
      "catalog.product.choose_breadcrumb",
      "Empanado",
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
      "catalog.product.out_of_stock",
      "Sin stock",
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

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <Link
          href="/#productos"
          className="mb-6 inline-flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-muted transition-colors hover:text-ink"
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
