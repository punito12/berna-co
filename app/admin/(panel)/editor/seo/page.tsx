import CmsComingSoonCard from "@/components/CmsComingSoonCard";

export default function EditorSeoPage() {
  return (
    <CmsComingSoonCard
      title="SEO y compartir"
      description="Esta sección todavía no es editable: se implementa en la próxima fase. Acá vas a poder editar cómo aparece la web en Google y al compartirla por WhatsApp o redes sociales."
      items={[
        "Título general del sitio",
        "Descripción para Google",
        "Imagen para compartir",
        "Preview de WhatsApp/redes",
        "SEO de productos",
        "SEO de ingredientes",
      ]}
    />
  );
}
