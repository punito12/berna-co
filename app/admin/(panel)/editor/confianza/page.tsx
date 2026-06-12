import CmsComingSoonCard from "@/components/CmsComingSoonCard";

export default function EditorConfianzaPage() {
  return (
    <CmsComingSoonCard
      title="Confianza"
      description="Esta sección todavía no es editable: se implementa en la próxima fase. Acá vas a poder editar cómo comprar, preguntas frecuentes, envíos, zonas, conservación de congelados y medios de pago."
      items={[
        "Cómo comprar",
        "Preguntas frecuentes",
        "Envíos y zonas",
        "Conservación de congelados",
        "Medios de pago",
        "Ayuda por WhatsApp",
      ]}
    />
  );
}
