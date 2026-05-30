import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/products";
import { formatWeight } from "@/lib/products";
import ProductGallery from "@/components/ProductGallery";
import AddToCartPanel from "@/components/AddToCartPanel";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

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
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Link
          href="/#productos"
          className="mb-6 inline-block font-bold uppercase tracking-widest text-xs text-muted hover:text-ink"
        >
          ‹ Volver a productos
        </Link>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* Gallery */}
          <ProductGallery
            images={product.images}
            name={product.name}
            isNew={product.isNew}
            category={product.category}
          />

          {/* Info + buy */}
          <div>
            <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
              {product.category}
            </p>
            <h1 className="mt-2 font-black uppercase tracking-tight text-4xl sm:text-5xl text-ink">
              {product.name}
            </h1>
            <p className="mt-2 font-bold uppercase tracking-wide text-sm text-muted">
              {formatWeight(product.weightGrams)}
            </p>

            <p className="mt-6 font-serif text-lg leading-relaxed text-ink/80">
              {product.description}
            </p>

            <AddToCartPanel product={product} />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
