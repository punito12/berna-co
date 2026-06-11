import type { Metadata } from "next";
import LegalInfoPage from "@/components/LegalInfoPage";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Envíos y zonas de entrega",
  description:
    "Información general sobre zonas de entrega, horarios, coordinación y costos de envío de Berna&co.",
  alternates: {
    canonical: absoluteUrl("/envios"),
  },
};

export default function ShippingPage() {
  return (
    <LegalInfoPage
      eyebrow={SITE_NAME}
      title="Envíos y zonas de entrega"
      intro="La tienda valida zonas y opciones de entrega durante el checkout. Si tenés dudas antes de comprar, podés consultarnos por WhatsApp."
      sections={[
        {
          title: "Zonas disponibles",
          body: "Las entregas se realizan en las zonas habilitadas al momento de comprar. Si una dirección queda fuera de cobertura, el checkout lo indicará o podremos confirmarlo por WhatsApp.",
        },
        {
          title: "Días y horarios",
          body: "Los días, franjas horarias y cupos disponibles pueden variar. La opción elegida en el checkout queda sujeta a confirmación operativa del pedido.",
        },
        {
          title: "Costo de envío",
          body: "El costo de envío, descuentos o umbrales de envío bonificado se muestran durante el checkout según la configuración vigente y la dirección del cliente.",
        },
        {
          title: "Recepción del pedido",
          body: "Al recibir productos congelados, recomendamos guardarlos rápidamente en freezer. Si hay un inconveniente con la entrega, contactanos cuanto antes.",
        },
      ]}
    />
  );
}
