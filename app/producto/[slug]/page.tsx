import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import WhatsappFloat from "@/components/WhatsappFloat";

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

        <ProductDetail product={product} />
      </div>

      <Footer />
      <WhatsappFloat />
    </main>
  );
}
