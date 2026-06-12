import type { Metadata } from "next";
import LegalInfoPage from "@/components/LegalInfoPage";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { loadCmsBundle, isPreview } from "@/lib/cms";
import { isCmsPreviewRequest } from "@/lib/cms-preview";
import { LEGAL_PAGES, resolveLegalContent } from "@/lib/cms-legal";

const PAGE = LEGAL_PAGES.find((p) => p.slug === "cambios")!;

export const metadata: Metadata = {
  title: "Cambios, devoluciones y cancelaciones",
  description:
    "Criterios generales para cambios, devoluciones y cancelaciones de pedidos en Berna&co.",
  alternates: {
    canonical: absoluteUrl("/cambios-devoluciones"),
  },
};

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams?: { preview?: string };
}) {
  const cms = await loadCmsBundle();
  const preview = (await isPreview()) || isCmsPreviewRequest(searchParams?.preview);
  const { title, intro, sections } = resolveLegalContent(PAGE, cms, preview);

  return (
    <LegalInfoPage
      eyebrow={SITE_NAME}
      title={title}
      intro={intro}
      sections={sections}
    />
  );
}
