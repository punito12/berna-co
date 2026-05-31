import Hero from "@/components/Hero";
import QualityBadges from "@/components/QualityBadges";
import Catalog from "@/components/Catalog";
import Footer from "@/components/Footer";
import WhatsappFloat from "@/components/WhatsappFloat";
import { getAvailableProducts } from "@/lib/products";

// Home page: dark hero + quality strip + product grid (with local cart).
// Server component — it reads products from the database directly.
export default async function HomePage() {
  const products = await getAvailableProducts();

  return (
    <main>
      <Hero />
      <QualityBadges />

      {products.length > 0 ? (
        <Catalog products={products} />
      ) : (
        <section className="bg-cream px-4 py-24 text-center">
          <p className="font-bold uppercase tracking-wide text-muted">
            No hay productos cargados todavía.
          </p>
          <p className="mt-2 text-sm text-muted">
            Corré <code>npm run db:seed</code> para cargar el catálogo.
          </p>
        </section>
      )}

      <Footer />
      <WhatsappFloat />
    </main>
  );
}
