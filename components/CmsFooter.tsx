import Footer from "@/components/Footer";
import { getSiteImage, getSiteText, loadCmsBundle } from "@/lib/cms";

// Footer con textos/imágenes del CMS. Sin maquinaria de diseño: el estilo del
// footer vive en el componente (CMS v2 = solo contenido).
export default async function CmsFooter({ preview = false }: { preview?: boolean }) {
  try {
    const cms = await loadCmsBundle();
    return (
      <Footer
        slogan={getSiteText(cms, "footer.slogan", "¡La vida es rica!", preview)}
        badgeUrl={getSiteImage(cms, "footer.badge", "/images/footer.png", preview)}
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
        textKeys={{
          slogan: "footer.slogan",
          instagram: "footer.instagram",
          email: "footer.email",
          whatsapp: "footer.whatsapp",
          copyright: "footer.copyright",
        }}
      />
    );
  } catch {
    return <Footer />;
  }
}
