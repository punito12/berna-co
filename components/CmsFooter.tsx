import Footer from "@/components/Footer";
import {
  getLogo,
  getSections,
  getSiteText,
  loadCmsBundle,
} from "@/lib/cms";
import {
  sectionDesignToStyle,
  sectionMobileCssRules,
  titleDesignToStyle,
} from "@/lib/cms-design";
import type { CmsBlockConfig } from "@/lib/cms-blocks";

export default async function CmsFooter({ preview = false }: { preview?: boolean }) {
  try {
    const cms = await loadCmsBundle();
    const footerSection = getSections(cms, "home", preview).find(
      (section) => section.key === "home.footer"
    );
    const footerConfig = footerSection?.config as CmsBlockConfig | undefined;
    const footerDesignCss = sectionMobileCssRules({
      sectionKey: "global.footer",
      titleTextKey: "footer.slogan",
      design: footerConfig?.design,
    });
    return (
      <>
        {footerDesignCss && (
          <style dangerouslySetInnerHTML={{ __html: footerDesignCss }} />
        )}
        <Footer
          slogan={getSiteText(cms, "footer.slogan", "¡La vida es rica!", preview)}
          instagram={getSiteText(cms, "footer.instagram", "@berna.and.co", preview)}
          instagramUrl={getSiteText(
            cms,
            "footer.instagramUrl",
            "https://instagram.com/berna.and.co",
            preview
          )}
          email={getSiteText(cms, "footer.email", "csberna2020@gmail.com", preview)}
          whatsapp={getSiteText(cms, "footer.whatsapp", "+54 11 2545-0304", preview)}
          copyright={getSiteText(
            cms,
            "footer.copyright",
            getSiteText(
              cms,
              "footer.legal.copyright",
              "© Berna&co. Todos los derechos reservados.",
              preview
            ),
            preview
          )}
          logoUrl={getLogo(cms, preview)}
          newsletterTitle={getSiteText(
            cms,
            "home.newsletter.title",
            "Sumate al newsletter",
            preview
          )}
          newsletterSubtitle={getSiteText(
            cms,
            "home.newsletter.subtitle",
            "Novedades, recetas y promos. Sin spam.",
            preview
          )}
          newsletterPlaceholder={getSiteText(
            cms,
            "home.newsletter.placeholder",
            "tu@email.com",
            preview
          )}
          newsletterButton={getSiteText(
            cms,
            "home.newsletter.button",
            "Sumarme",
            preview
          )}
          newsletterSuccess={getSiteText(
            cms,
            "home.newsletter.success",
            "¡Gracias! Te vas a enterar de las novedades.",
            preview
          )}
          sectionStyle={sectionDesignToStyle(footerConfig?.design)}
          titleStyle={titleDesignToStyle(footerConfig?.design)}
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
      </>
    );
  } catch {
    return <Footer />;
  }
}
