import CmsComingSoonCard from "@/components/CmsComingSoonCard";

export default function EditorConfianzaPage() {
  return (
    <CmsComingSoonCard
      title="Confianza"
      description="Próximamente vas a poder editar acá los bloques que ayudan al cliente a entender cómo comprar y qué esperar antes de hacer un pedido."
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
