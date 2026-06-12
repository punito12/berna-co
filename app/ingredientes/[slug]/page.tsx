import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BernaLogo from "@/components/BernaLogo";
import CmsFooter from "@/components/CmsFooter";
import WhatsappFloat from "@/components/WhatsappFloat";
import {
  cmsTextAttrs,
  getSiteText,
  isPreview,
  loadCmsBundle,
  textStylesToCss,
} from "@/lib/cms";
import {
  getIngredientPage,
  INGREDIENT_PAGES,
} from "@/lib/ingredients";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
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
  const title = getSiteText(
    cms,
    ingredient.titleKey,
    ingredient.fallbackTitle,
    preview
  );
  const intro = getSiteText(
    cms,
    ingredient.introKey,
    ingredient.fallbackIntro,
    preview
  );
  const body = getSiteText(
    cms,
    ingredient.bodyKey,
    ingredient.fallbackBody,
    preview
  );

  return (
    <main className="min-h-screen bg-cream text-ink">
      {previewTextCss && (
        <style dangerouslySetInnerHTML={{ __html: previewTextCss }} />
      )}
      <header className="border-b border-ink/10 bg-cream/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <Link href="/" aria-label="Volver al inicio">
            <BernaLogo variant="dark" size="sm" />
          </Link>
          <Link
            href={
              preview && searchParams?.preview
                ? `/?preview=${encodeURIComponent(searchParams.preview)}#ingredientes`
                : "/#ingredientes"
            }
            className="text-xs font-black uppercase tracking-[0.22em] text-ink/60 transition-colors hover:text-ink"
          >
            Ingredientes
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-tomato">
          {SITE_NAME} · Ingredientes
        </p>
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <h1
              className="max-w-3xl font-display text-4xl font-black leading-none sm:text-6xl"
              {...cmsTextAttrs(ingredient.titleKey)}
            >
              {title}
            </h1>
            <p
              className="mt-6 max-w-2xl text-base leading-7 text-ink/70 sm:text-lg"
              {...cmsTextAttrs(ingredient.introKey)}
            >
              {intro}
            </p>
          </div>

          <aside className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-muted">
              En nuestras preparaciones
            </p>
            <p
              className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/75 sm:text-base"
              {...cmsTextAttrs(ingredient.bodyKey)}
            >
              {body}
            </p>
          </aside>
        </div>

        <div className="mt-10 rounded-2xl bg-ink p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="font-black uppercase tracking-[0.12em]">
              ¿Querés ver los productos?
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Volvé al catálogo para elegir tus milanesas y congelados.
            </p>
          </div>
          <Link
            href={
              preview && searchParams?.preview
                ? `/?preview=${encodeURIComponent(searchParams.preview)}#productos`
                : "/#productos"
            }
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-tomato px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-tomato/90 sm:mt-0"
          >
            Ver productos
          </Link>
        </div>
      </section>

      <WhatsappFloat />
      <CmsFooter preview={preview} />
    </main>
  );
}
