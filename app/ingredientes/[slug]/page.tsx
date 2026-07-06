import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import CartOverlay from "@/components/CartOverlay";
import CmsFooter from "@/components/CmsFooter";
import RichText from "@/components/RichText";
import HomeHeader from "@/components/HomeHeader";
import WhatsappFloat from "@/components/WhatsappFloat";
import {
  getSiteImage,
  getSiteText,
  isPreview,
  loadCmsBundle,
  textStylesToCss,
} from "@/lib/cms";
import { getCartLabels } from "@/lib/cms-cart-labels";
import {
  getIngredientPage,
  INGREDIENT_PAGES,
} from "@/lib/ingredients";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import { cmsUsedGoogleFontsUrl } from "@/lib/cms-fonts";
import { absoluteUrl } from "@/lib/seo";
import Link from "next/link";

type PageProps = {
  params: { slug: string };
  searchParams?: { preview?: string };
};

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: PageProps): Metadata {
  const ingredient = getIngredientPage(params.slug);
  if (!ingredient) {
    return {};
  }

  return {
    title: `${ingredient.fallbackTitle} | Ingredientes Berna&co`,
    description: ingredient.fallbackIntro,
    alternates: {
      canonical: absoluteUrl(ingredient.href),
    },
    openGraph: {
      title: `${ingredient.fallbackTitle} | Ingredientes Berna&co`,
      description: ingredient.fallbackIntro,
      url: absoluteUrl(ingredient.href),
      type: "article",
    },
  };
}

export default async function IngredientDetailPage({
  params,
  searchParams,
}: PageProps) {
  const ingredient = getIngredientPage(params.slug);
  if (!ingredient) {
    notFound();
  }

  const cms = await loadCmsBundle();
  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams?.preview);
  const previewTextCss = preview ? textStylesToCss(cms, true) : "";
  const previewFontsUrl = preview
    ? cmsUsedGoogleFontsUrl([
        cms.content?.typographyDraft,
        ...Array.from(cms.texts.values()).map((text) => text.styleDraft),
        ...cms.sections.map((section) => section.configDraft),
      ])
    : "";
  const sectionKey = ingredient.titleKey.replace(".title", "");
  const title = getSiteText(
    cms,
    ingredient.titleKey,
    ingredient.fallbackTitle,
    preview
  );
  const stampLabel = getSiteText(cms, "ingredient.stamp", "Nuestros ingredientes", preview);
  const preparationsLabel = getSiteText(cms, "ingredient.preparations", "En nuestras preparaciones", preview);
  const backLabel = getSiteText(cms, "ingredient.back", "Volver", preview);
  const ctaLabel = getSiteText(cms, "ingredient.cta", "Ver productos", preview);
  const photoUrl = getSiteImage(
    cms,
    `ingredient.${ingredient.slug}.photo`,
    `/images/ingredientes/${ingredient.slug}.png`,
    preview
  );
  const headerLabels = {
    productsLabel: getSiteText(cms, "header.products", "Productos", preview),
    cartLabel: getSiteText(cms, "header.cart", "Carrito", preview),
  };
  const cartLabels = getCartLabels(cms, preview);
  const body = getSiteText(
    cms,
    ingredient.bodyKey,
    ingredient.fallbackBody,
    preview
  );

  return (
    <main className="min-h-screen bg-cream text-ink" data-cms-page="ingredientes">
      {previewFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link href={previewFontsUrl} rel="stylesheet" />
        </>
      )}
      {previewTextCss && (
        <style dangerouslySetInnerHTML={{ __html: previewTextCss }} />
      )}
      {/* Mismo header que el home (variante visible al tope de la página) */}
      <HomeHeader variant="page" {...headerLabels} />

      <section
        className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:pb-16 sm:pt-28"
        data-cms-section={sectionKey}
      >
        <Link
          href={
            preview && searchParams?.preview
              ? `/?preview=${encodeURIComponent(searchParams.preview)}#ingredientes`
              : "/#ingredientes"
          }
          className="animate-fade-up mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white/85 px-5 py-2 font-bold uppercase tracking-widest text-xs text-ink shadow-[0_8px_25px_rgba(10,10,10,0.08)] backdrop-blur-xl transition-transform duration-200 hover:scale-105 active:scale-95 sm:mb-8"
        >
          ‹ {backLabel}
        </Link>

        {/* Hero del ingrediente: texto izq + FOTO der (como "nuestros
            productos"). Foto: public/images/ingredientes/{slug}.jpg */}
        <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12">
          <div>
            <p className="animate-fade-up inline-block rounded-full bg-ink px-5 py-2 font-bold uppercase tracking-[0.25em] text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.2)]">
              {stampLabel}
            </p>
            <div className="animate-fade-up" style={{ animationDelay: "90ms" }}>
              <RichText
                text={title}
                textKey={ingredient.titleKey}
                className="mt-5 max-w-xl font-black uppercase tracking-tight text-5xl leading-[0.95] text-ink sm:text-7xl"
              />
            </div>
          </div>

          {/* Fotos apaisadas 3:2 (1536×1024), todas iguales */}
          <div
            className="animate-fade-up relative aspect-[3/2] w-full overflow-hidden rounded-3xl border border-line"
            style={{ animationDelay: "150ms" }}
          >
            <Image
              src={photoUrl}
              alt={ingredient.fallbackTitle}
              fill
              sizes="(max-width: 640px) 90vw, 560px"
              priority
              className="object-cover"
            />
          </div>
        </div>

        {/* Panel tinta con el cuerpo del texto */}
        <div
          className="animate-fade-up mt-10 rounded-3xl bg-ink p-6 text-white shadow-[0_25px_60px_rgba(10,10,10,0.25)] sm:mt-14 sm:p-10"
          style={{ animationDelay: "260ms" }}
        >
          <p className="inline-block rounded-full bg-cream px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-ink">
            {preparationsLabel}
          </p>
          <RichText
            text={body}
            textKey={ingredient.bodyKey}
            className="mt-5 max-w-3xl space-y-3 text-base leading-relaxed text-cream/85 sm:text-lg"
          />
        </div>

        {/* Otros ingredientes + CTA al catálogo */}
        <div
          className="animate-fade-up mt-10 flex flex-wrap items-center justify-between gap-4 sm:mt-14"
          style={{ animationDelay: "340ms" }}
        >
          {/* Otros ingredientes — solo desktop */}
          <div className="hidden flex-wrap items-center gap-2.5 sm:flex">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">
              Otros ingredientes
            </span>
            {INGREDIENT_PAGES.filter((p) => p.slug !== ingredient.slug).map(
              (p) => (
                <Link
                  key={p.slug}
                  href={
                    preview && searchParams?.preview
                      ? `${p.href}?preview=${encodeURIComponent(searchParams.preview)}`
                      : p.href
                  }
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 py-2 font-bold uppercase tracking-widest text-xs text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-ink active:scale-95"
                >
                  {p.fallbackTitle}
                </Link>
              )
            )}
          </div>
          <Link
            href={
              preview && searchParams?.preview
                ? `/?preview=${encodeURIComponent(searchParams.preview)}#productos`
                : "/#productos"
            }
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-7 py-3 font-bold uppercase tracking-widest text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.25)] transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      <WhatsappFloat />
      <CartOverlay labels={cartLabels} />
      <CmsFooter preview={preview} />
    </main>
  );
}
