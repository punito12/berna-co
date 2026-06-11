import type { Metadata } from "next";
import LegalInfoPage from "@/components/LegalInfoPage";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones generales de compra, disponibilidad, precios, entrega y contacto de Berna&co.",
  alternates: {
    canonical: absoluteUrl("/terminos"),
  },
};

export default function TermsPage() {
  return (
    <LegalInfoPage
      eyebrow={SITE_NAME}
      title="Términos y condiciones"
      intro="Estas condiciones explican el uso general de la tienda online y el proceso de compra. La operación final depende de disponibilidad, zona y coordinación del pedido."
      sections={[
        {
          title: "Pedidos y disponibilidad",
          body: "Los productos se ofrecen según stock disponible. Si algún producto no estuviera disponible al preparar el pedido, nos comunicaremos para coordinar una alternativa o ajuste.",
        },
        {
          title: "Precios y promociones",
          body: "Los precios, promociones y descuentos pueden actualizarse. El total válido es el confirmado durante el checkout o por los canales de contacto oficiales.",
        },
        {
          title: "Entrega",
          body: "Las entregas se realizan en zonas, días y horarios disponibles según la configuración vigente. La dirección informada debe ser correcta para poder coordinar el envío.",
        },
        {
          title: "Atención del pedido",
          body: "Ante dudas, cambios necesarios o inconvenientes con una compra, el canal recomendado es WhatsApp. Revisá el pedido al recibirlo para avisarnos cuanto antes si hay algún problema.",
        },
      ]}
    />
  );
}
