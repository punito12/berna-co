import Hero from "@/components/Hero";
import Ingredients from "@/components/Ingredients";
import Catalog from "@/components/Catalog";
import PointsOfSale from "@/components/PointsOfSale";
import Footer from "@/components/Footer";
import NewsletterForm from "@/components/NewsletterForm";
import RichText from "@/components/RichText";
import {
  getLogo,
  cmsTextAttrs,
  getSiteImage,
  getSiteText,
  type CmsBundle,
  type SectionView,
} from "@/lib/cms";
import {
  normalizeBlockType,
  type CmsBlockConfig,
} from "@/lib/cms-blocks";
import { textStyleCssRule } from "@/lib/cms-text-styles";
import type { ProductForUI } from "@/lib/products";

type PaymentDiscounts = {
  efectivoDiscountPercent: number;
  transferenciaDiscountPercent: number;
};

export default function CmsHomeSection({
  section,
  cms,
  preview,
  previewToken,
  products,
  payCfg,
}: {
  section: SectionView;
  cms: CmsBundle;
  preview: boolean;
  previewToken?: string;
  products: ProductForUI[];
  payCfg: PaymentDiscounts;
}) {
  const config = section.config as CmsBlockConfig;
  const type = normalizeBlockType(section.type, section.key);
  const t = (key: string, fb: string) => getSiteText(cms, key, fb, preview);
  const image = (key: string, fb: string) => getSiteImage(cms, key, fb, preview);
  const logoUrl = getLogo(cms, preview);
  const blockStyleCss = blockTextStylesCss(section.key, config);

  if (section.key === "home.hero" || type === "hero") {
    return (
      <>
        {/* Las fuentes/estilos por-texto del bloque se inyectan acá; sin esto
            el Hero ignoraba el control de fuente del CMS. */}
        {blockStyleCss && (
          <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />
        )}
        <Hero
          title={
            config.title ||
            t("home.hero.title", "Milanesas premium\ny congelados caseros")
          }
          subtitle={
            config.subtitle ||
            t(
              "home.hero.subtitle",
              "Elegí online, coordiná la entrega y pagá como prefieras."
            )
          }
          cta={config.ctaLabel || t("home.hero.cta_primary", "Comprar ahora")}
          backgroundUrl={
            config.imageUrl || image("home.hero.background", "/images/hero.jpg")
          }
          logoUrl={logoUrl}
          titleKey="home.hero.title"
          subtitleKey="home.hero.subtitle"
          ctaKey="home.hero.cta_primary"
        />
      </>
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
          "catalog.product.breadcrumb_label",
          t("catalog.product.choose_breadcrumb", "Empanado")
        )}
        newLabel={t("catalog.badge.new", "New")}
        paymentCashLabel={t("catalog.product.payment_cash_label", "efectivo")}
        paymentTransferLabel={t(
          "catalog.product.payment_transfer_label",
          "transferencia"
        )}
        paymentTransferShortLabel={t(
          "catalog.product.payment_transfer_short_label",
          "transf."
        )}
        viewDetailLabel={t(
          "catalog.product.view_detail_label",
          "Ver detalle y fotos →"
        )}
        cartShowLabel={t("catalog.cart.show_label", "Ver carrito")}
        cartHideLabel={t("catalog.cart.hide_label", "Ocultar carrito")}
        cartContinueLabel={t("catalog.cart.continue_label", "Continuar")}
        lowStockLabel={t(
          "catalog.product.low_stock_label",
          "Solo quedan {count} disponibles"
        )}
        addedLabel={t("catalog.product.added_label", "Agregado ✓")}
        noMoreStockLabel={t(
          "catalog.product.no_more_stock_label",
          "Sin más stock disponible"
        )}
        categoryLabels={{
          CARNE: t("catalog.filter.carne", "Carne"),
          POLLO: t("catalog.filter.pollo", "Pollo"),
          CERDO: t("catalog.filter.cerdo", "Cerdo"),
          VEGANO: t("catalog.filter.vegano", "Vegano"),
        }}
        textKeys={{
          eyebrow: "catalogo.eyebrow",
          title: "catalogo.title",
          subtitle: "catalogo.subtitle",
          allLabel: "catalog.filter.all",
          outOfStockLabel: "catalog.product.out_of_stock",
          addToCartLabel: "catalog.product.add_to_cart",
          chooseBreadcrumbLabel: "catalog.product.choose_breadcrumb",
          newLabel: "catalog.badge.new",
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
        {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center sm:py-24">
          <div className="overflow-hidden rounded-lg border border-line bg-cream">
            {aboutImage ? (
              <img
                src={aboutImage}
                alt={config.imageAlt || t("home.about.title", "Berna & Co")}
                className="h-full min-h-64 w-full object-cover sm:min-h-80"
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center px-6 text-center font-black uppercase tracking-tight text-line sm:min-h-80">
                {t("home.about.title", "Berna & Co")}
              </div>
            )}
          </div>
          <div>
            {(() => {
              // "Nuestra historia" eyebrow: uses its own (optional) text. No
              // hardcoded "LA VIDA ES RICA!" fallback — only renders if there's
              // actual content (block config or an explicit CMS value).
              const aboutEyebrow =
                config.eyebrow || t("home.about.eyebrow", "");
              if (!aboutEyebrow) return null;
              return (
                <p
                  className="font-bold uppercase tracking-[0.3em] text-xs text-muted"
                  {...cmsTextAttrs("home.about.eyebrow")}
                >
                  {aboutEyebrow}
                </p>
              );
            })()}
            <h2
              className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl"
              {...cmsTextAttrs("home.about.title")}
            >
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
              textKey="home.about.body"
              className="mt-6 space-y-3 text-base leading-relaxed text-ink/80"
            />
          </div>
        </div>
      </section>
    );
  }

  if (section.key === "home.ingredients") {
    return (
      <>
        {/* Igual que el Hero: sin este <style> el control de fuente de
            "Nuestros ingredientes" no aplicaba en el sitio público. */}
        {blockStyleCss && (
          <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />
        )}
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
          previewToken={preview ? previewToken : undefined}
        />
      </>
    );
  }

  if (type === "features") {
    const featureItems =
      config.items && config.items.length > 0
        ? config.items
        : [
            {
              title: t("home.features.item1.title", "Comprá online"),
              body: t(
                "home.features.item1.text",
                "Elegí tus productos y armá el pedido en pocos pasos."
              ),
            },
            {
              title: t("home.features.item2.title", "Entrega coordinada"),
              body: t(
                "home.features.item2.text",
                "Recibí en zonas disponibles o coordiná por WhatsApp."
              ),
            },
            {
              title: t("home.features.item3.title", "Pagos simples"),
              body: t(
                "home.features.item3.text",
                "Efectivo, transferencia o Mercado Pago según disponibilidad."
              ),
            },
            {
              title: t("home.features.item4.title", "Listo para freezer"),
              body: t(
                "home.features.item4.text",
                "Productos seleccionados para resolver comidas sin vueltas."
              ),
            },
          ];
    return (
      <section className="bg-cream">
        {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="mb-8 text-center sm:mb-12">
            {config.eyebrow && (
              <p
                className="font-bold uppercase tracking-[0.3em] text-xs text-muted"
                {...cmsTextAttrs(`${section.key}.eyebrow`)}
              >
                {config.eyebrow}
              </p>
            )}
            <h2
              className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl"
              {...cmsTextAttrs(`${section.key}.title`)}
            >
              {config.title || t("home.features.title", "Cómo comprar")}
            </h2>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {featureItems.map((item, i) => (
              <li key={i} className="bg-white px-5 py-7 text-center sm:px-6 sm:py-10">
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
        eyebrowKey="home.pos.eyebrow"
        titleKey="home.pos.title"
        subtitleKey="home.pos.subtitle"
      />
    );
  }

  if (type === "image_text") {
    const imageLeft = config.imageSide !== "right";
    return (
      <section className="bg-cream">
        {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center sm:py-20">
          <BlockImage config={config} className={imageLeft ? "" : "md:order-2"} />
          <BlockCopy config={config} sectionKey={section.key} />
        </div>
      </section>
    );
  }

  if (type === "faq") {
    return (
      <section className="bg-cream">
        {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
        <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
          <h2
            className="font-black uppercase tracking-tight text-4xl text-ink"
            {...cmsTextAttrs(`${section.key}.title`)}
          >
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
        {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
        <h2
          className="font-black uppercase tracking-tight text-4xl"
          {...cmsTextAttrs(`${section.key}.title`)}
        >
          {config.title || "La vida es rica"}
        </h2>
        {config.subtitle && (
          <p
            className="mx-auto mt-3 max-w-xl text-cream"
            {...cmsTextAttrs(`${section.key}.subtitle`)}
          >
            {config.subtitle}
          </p>
        )}
        {config.ctaLabel && config.ctaHref && (
          <a
            href={config.ctaHref}
            className="mt-8 inline-flex bg-white px-8 py-4 font-bold uppercase tracking-widest text-sm text-black"
            {...cmsTextAttrs(`${section.key}.ctaLabel`)}
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
        {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
        <h2
          className="font-black uppercase tracking-tight text-3xl"
          {...cmsTextAttrs(`${section.key}.title`)}
        >
          {config.title || "Sumate al newsletter"}
        </h2>
        {config.subtitle && (
          <p
            className="mx-auto mt-2 max-w-md text-sm text-white/60"
            {...cmsTextAttrs(`${section.key}.subtitle`)}
          >
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
        textKeys={{
          slogan: "footer.slogan",
          instagram: "footer.instagram",
          email: "footer.email",
          whatsapp: "footer.whatsapp",
          copyright: "footer.copyright",
          newsletterTitle: "home.newsletter.title",
          newsletterSubtitle: "home.newsletter.subtitle",
          newsletterPlaceholder: "home.newsletter.placeholder",
          newsletterButton: "home.newsletter.button",
        }}
      />
    );
  }

  return (
    <section className="bg-cream">
      {blockStyleCss && <style dangerouslySetInnerHTML={{ __html: blockStyleCss }} />}
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <BlockCopy config={config} sectionKey={section.key} />
      </div>
    </section>
  );
}

function BlockCopy({
  config,
  sectionKey,
}: {
  config: CmsBlockConfig;
  sectionKey: string;
}) {
  return (
    <div>
      {config.eyebrow && (
        <p
          className="font-bold uppercase tracking-[0.3em] text-xs text-muted"
          {...cmsTextAttrs(`${sectionKey}.eyebrow`)}
        >
          {config.eyebrow}
        </p>
      )}
      <h2
        className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-5xl"
        {...cmsTextAttrs(`${sectionKey}.title`)}
      >
        {config.title || "Sección"}
      </h2>
      {config.subtitle && (
        <p
          className="mt-4 font-serif italic text-lg text-muted"
          {...cmsTextAttrs(`${sectionKey}.subtitle`)}
        >
          {config.subtitle}
        </p>
      )}
      {config.body && (
        <RichText
          text={config.body}
          textKey={`${sectionKey}.body`}
          className="mt-5 space-y-2 text-base leading-relaxed text-ink/80"
        />
      )}
      {config.ctaLabel && config.ctaHref && (
        <a
          href={config.ctaHref}
          className="mt-6 inline-flex bg-black px-6 py-3 font-bold uppercase tracking-widest text-xs text-white"
          {...cmsTextAttrs(`${sectionKey}.ctaLabel`)}
        >
          {config.ctaLabel}
        </a>
      )}
    </div>
  );
}

// Some sections render their heading text with a DIFFERENT data-cms-text key
// than `${sectionKey}.${part}` (e.g. the products grid reuses catalogo.* keys,
// the hero CTA uses cta_primary). This maps a block part to the REAL key the
// public element carries, so font/style changes actually apply. Parts not
// listed fall back to `${sectionKey}.${part}` (which already matches).
const BLOCK_PART_KEY_OVERRIDES: Record<string, Record<string, string>> = {
  "home.products": {
    eyebrow: "catalogo.eyebrow",
    title: "catalogo.title",
    subtitle: "catalogo.subtitle",
  },
  "home.hero": {
    ctaLabel: "home.hero.cta_primary",
  },
};

function blockPartKey(sectionKey: string, part: string): string {
  return BLOCK_PART_KEY_OVERRIDES[sectionKey]?.[part] ?? `${sectionKey}.${part}`;
}

function blockTextStylesCss(sectionKey: string, config: CmsBlockConfig): string {
  if (!config.textStyles) return "";
  return Object.entries(config.textStyles)
    .map(([part, style]) =>
      textStyleCssRule(blockPartKey(sectionKey, part), style)
    )
    .filter(Boolean)
    .join("");
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
