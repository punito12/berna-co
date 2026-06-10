import Hero from "@/components/Hero";
import Ingredients from "@/components/Ingredients";
import Catalog from "@/components/Catalog";
import PointsOfSale from "@/components/PointsOfSale";
import Footer from "@/components/Footer";
import NewsletterForm from "@/components/NewsletterForm";
import RichText from "@/components/RichText";
import {
  getLogo,
  getSiteImage,
  getSiteText,
  type CmsBundle,
  type SectionView,
} from "@/lib/cms";
import {
  normalizeBlockType,
  type CmsBlockConfig,
} from "@/lib/cms-blocks";
import type { ProductForUI } from "@/lib/products";

type PaymentDiscounts = {
  efectivoDiscountPercent: number;
  transferenciaDiscountPercent: number;
};

export default function CmsHomeSection({
  section,
  cms,
  preview,
  products,
  payCfg,
}: {
  section: SectionView;
  cms: CmsBundle;
  preview: boolean;
  products: ProductForUI[];
  payCfg: PaymentDiscounts;
}) {
  const config = section.config as CmsBlockConfig;
  const type = normalizeBlockType(section.type, section.key);
  const t = (key: string, fb: string) => getSiteText(cms, key, fb, preview);
  const image = (key: string, fb: string) => getSiteImage(cms, key, fb, preview);
  const logoUrl = getLogo(cms, preview);

  if (section.key === "home.hero" || type === "hero") {
    return (
      <Hero
        title={config.title || t("home.hero.title", "Milanesas\nPremium")}
        subtitle={
          config.subtitle || t("home.hero.subtitle", "de nuestra cocina a tu freezer")
        }
        cta={config.ctaLabel || t("home.hero.cta_primary", "Ver productos")}
        backgroundUrl={
          config.imageUrl || image("home.hero.background", "/images/hero.jpg")
        }
        logoUrl={logoUrl}
      />
    );
  }

  if (section.key === "home.products" || type === "products_grid") {
    return products.length > 0 ? (
      <Catalog
        products={products}
        efectivoPct={payCfg.efectivoDiscountPercent}
        transferenciaPct={payCfg.transferenciaDiscountPercent}
        eyebrow={config.eyebrow || t("catalogo.eyebrow", "Congelados Caseros")}
        title={config.title || t("catalogo.title", "Nuestros productos")}
        subtitle={
          config.subtitle ||
          t("catalogo.subtitle", "Elegí tu corte y tu empanado. Listas para el horno.")
        }
        allLabel={t("catalog.filter.all", t("catalogo.filter.all", "Todos"))}
        outOfStockLabel={t(
          "catalog.product.out_of_stock",
          t("catalogo.outOfStock", "Sin stock")
        )}
        addToCartLabel={t("catalog.product.add_to_cart", "Agregar al carrito")}
        chooseBreadcrumbLabel={t(
          "catalog.product.choose_breadcrumb",
          "Empanado"
        )}
        newLabel={t("catalog.badge.new", "New")}
        categoryLabels={{
          CARNE: t("catalog.filter.carne", "Carne"),
          POLLO: t("catalog.filter.pollo", "Pollo"),
          CERDO: t("catalog.filter.cerdo", "Cerdo"),
          VEGANO: t("catalog.filter.vegano", "Vegano"),
        }}
      />
    ) : (
      <section className="bg-cream px-4 py-24 text-center">
        <p className="font-bold uppercase tracking-wide text-muted">
          {t("catalogo.empty", "No hay productos cargados todavía.")}
        </p>
      </section>
    );
  }

  if (section.key === "home.about") {
    const aboutImage =
      config.imageUrl || image("home.about.image", "/images/about/cocina.jpg");
    return (
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-2 md:items-center sm:py-24">
          <div className="overflow-hidden rounded-lg border border-line bg-cream">
            {aboutImage ? (
              <img
                src={aboutImage}
                alt={config.imageAlt || t("home.about.title", "Berna & Co")}
                className="h-full min-h-80 w-full object-cover"
              />
            ) : (
              <div className="flex min-h-80 items-center justify-center px-6 text-center font-black uppercase tracking-tight text-line">
                {t("home.about.title", "Berna & Co")}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
              {config.eyebrow || t("home.hero.eyebrow", "LA VIDA ES RICA!")}
            </p>
            <h2 className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl">
              {config.title || t("home.about.title", "BERNA & CO")}
            </h2>
            <RichText
              text={
                config.body ||
                t(
                  "home.about.paragraph",
                  "Nace de nuestro amor por la comida rica, práctica y bien hecha."
                )
              }
              className="mt-6 space-y-3 text-base leading-relaxed text-ink/80"
            />
          </div>
        </div>
      </section>
    );
  }

  if (section.key === "home.ingredients") {
    return (
      <Ingredients
        eyebrow={config.eyebrow || t("home.ingredients.eyebrow", "Lo que hay adentro")}
        title={
          config.title ||
          t("home.ingredients.title", t("home.features.title", "Nuestros ingredientes"))
        }
        item1={
          config.items?.[0]?.title ||
          t("home.ingredients.item1", t("home.features.item3.title", "Huevos de gallinas libres"))
        }
        item2={
          config.items?.[1]?.title ||
          t("home.ingredients.item2", t("home.features.item2.title", "Pollo pastoril"))
        }
        item3={
          config.items?.[2]?.title ||
          t("home.ingredients.item3", "Peceto de pastura")
        }
      />
    );
  }

  if (type === "features") {
    const featureItems =
      config.items && config.items.length > 0
        ? config.items
        : [
            {
              title: t("home.features.item1.title", "Super Prácticas"),
              body: t(
                "home.features.item1.text",
                "Milanesas premium congeladas de forma individual."
              ),
            },
            {
              title: t("home.features.item2.title", "Marinadas 24 hs"),
              body: t(
                "home.features.item2.text",
                "Para lograr milanesas más tiernas."
              ),
            },
            {
              title: t("home.features.item3.title", "Huevos agroecológicos"),
              body: t(
                "home.features.item3.text",
                "Certificados, de la mejor calidad."
              ),
            },
            {
              title: t("home.features.item4.title", "Directo del freezer al horno"),
              body: t(
                "home.features.item4.text",
                "Se pueden cocinar sin descongelar."
              ),
            },
          ];
    return (
      <section className="bg-cream">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
          <div className="mb-12 text-center">
            {config.eyebrow && (
              <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
                {config.eyebrow}
              </p>
            )}
            <h2 className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl">
              {config.title || t("home.features.title", "Beneficios")}
            </h2>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {featureItems.map((item, i) => (
              <li key={i} className="bg-white px-6 py-10 text-center">
                <h3 className="font-black uppercase tracking-tight text-xl text-ink">
                  {item.title}
                </h3>
                {item.body && <p className="mt-2 text-sm text-muted">{item.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (section.key === "home.pos" || type === "map") {
    return (
      <PointsOfSale
        eyebrow={config.eyebrow || t("home.pos.eyebrow", "Dónde encontrarnos")}
        title={config.title || t("home.pos.title", "Puntos de venta")}
        subtitle={
          config.subtitle ||
          t("home.pos.subtitle", "Conseguí nuestros productos en estos locales.")
        }
        mapSrc={config.mapSrc}
      />
    );
  }

  if (type === "image_text") {
    const imageLeft = config.imageSide !== "right";
    return (
      <section className="bg-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-2 md:items-center">
          <BlockImage config={config} className={imageLeft ? "" : "md:order-2"} />
          <BlockCopy config={config} />
        </div>
      </section>
    );
  }

  if (type === "faq") {
    return (
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="font-black uppercase tracking-tight text-4xl text-ink">
            {config.title || "Preguntas frecuentes"}
          </h2>
          <div className="mt-8 divide-y divide-line rounded-lg border border-line bg-white">
            {(config.faqs ?? []).map((faq, i) => (
              <details key={i} className="p-5">
                <summary className="cursor-pointer font-bold text-ink">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === "cta") {
    return (
      <section className="bg-ink px-4 py-16 text-center text-white">
        <h2 className="font-black uppercase tracking-tight text-4xl">
          {config.title || "La vida es rica"}
        </h2>
        {config.subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-cream">{config.subtitle}</p>
        )}
        {config.ctaLabel && config.ctaHref && (
          <a
            href={config.ctaHref}
            className="mt-8 inline-flex bg-white px-8 py-4 font-bold uppercase tracking-widest text-sm text-black"
          >
            {config.ctaLabel}
          </a>
        )}
      </section>
    );
  }

  if (type === "newsletter") {
    return (
      <section className="bg-ink px-4 py-16 text-center text-white">
        <h2 className="font-black uppercase tracking-tight text-3xl">
          {config.title || "Sumate al newsletter"}
        </h2>
        {config.subtitle && (
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            {config.subtitle}
          </p>
        )}
        <div className="mt-6">
          <NewsletterForm
            title={config.title || t("home.newsletter.title", "Sumate al newsletter")}
            subtitle={
              config.subtitle ||
              t("home.newsletter.subtitle", "Novedades, recetas y promos. Sin spam.")
            }
            placeholder={t("home.newsletter.placeholder", "tu@email.com")}
            buttonLabel={t("home.newsletter.button", "Sumarme")}
            successMessage={t(
              "home.newsletter.success",
              "¡Gracias! Te vas a enterar de las novedades."
            )}
          />
        </div>
      </section>
    );
  }

  if (type === "footer") {
    return (
      <Footer
        slogan={t("footer.slogan", "¡La vida es rica!")}
        instagram={t("footer.instagram", "@berna.and.co")}
        instagramUrl={t("footer.instagramUrl", "https://instagram.com/berna.and.co")}
        email={t("footer.email", "csberna2020@gmail.com")}
        whatsapp={t("footer.whatsapp", "+54 11 2545-0304")}
        copyright={t(
          "footer.copyright",
          "© Berna&co. Todos los derechos reservados."
        )}
        logoUrl={logoUrl}
        newsletterTitle={t("home.newsletter.title", "Sumate al newsletter")}
        newsletterSubtitle={t(
          "home.newsletter.subtitle",
          "Novedades, recetas y promos. Sin spam."
        )}
        newsletterPlaceholder={t("home.newsletter.placeholder", "tu@email.com")}
        newsletterButton={t("home.newsletter.button", "Sumarme")}
        newsletterSuccess={t(
          "home.newsletter.success",
          "¡Gracias! Te vas a enterar de las novedades."
        )}
      />
    );
  }

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <BlockCopy config={config} />
      </div>
    </section>
  );
}

function BlockCopy({ config }: { config: CmsBlockConfig }) {
  return (
    <div>
      {config.eyebrow && (
        <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
          {config.eyebrow}
        </p>
      )}
      <h2 className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-5xl">
        {config.title || "Sección"}
      </h2>
      {config.subtitle && (
        <p className="mt-4 font-serif italic text-lg text-muted">{config.subtitle}</p>
      )}
      {config.body && (
        <RichText
          text={config.body}
          className="mt-5 space-y-2 text-base leading-relaxed text-ink/80"
        />
      )}
      {config.ctaLabel && config.ctaHref && (
        <a
          href={config.ctaHref}
          className="mt-6 inline-flex bg-black px-6 py-3 font-bold uppercase tracking-widest text-xs text-white"
        >
          {config.ctaLabel}
        </a>
      )}
    </div>
  );
}

function BlockImage({
  config,
  className = "",
}: {
  config: CmsBlockConfig;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-line bg-white ${className}`}>
      {config.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.imageUrl}
          alt={config.imageAlt || ""}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-white text-sm text-muted">
          Sin imagen
        </div>
      )}
    </div>
  );
}
