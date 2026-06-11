import type { Metadata } from "next";
import LegalInfoPage from "@/components/LegalInfoPage";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Berna&co utiliza los datos necesarios para gestionar pedidos, entregas, consultas y comunicaciones.",
  alternates: {
    canonical: absoluteUrl("/privacidad"),
  },
};

export default function PrivacyPage() {
  return (
    <LegalInfoPage
      eyebrow={SITE_NAME}
      title="Política de privacidad"
      intro="Usamos la información necesaria para tomar pedidos, coordinar entregas y responder consultas. Esta página resume el tratamiento de datos de forma simple."
      sections={[
        {
          title: "Datos que podemos solicitar",
          body: "Podemos pedir nombre, teléfono, email, dirección o zona de entrega, datos del pedido y cualquier información que el cliente comparta para coordinar la compra.",
        },
        {
          title: "Para qué los usamos",
          body: "Los usamos para confirmar pedidos, preparar productos, coordinar entregas, responder consultas, registrar operaciones y enviar comunicaciones solo cuando corresponda.",
        },
        {
          title: "Pagos",
          body: "Si se usan medios de pago externos, los datos de pago se procesan mediante proveedores especializados. Berna&co no necesita almacenar datos completos de tarjetas.",
        },
        {
          title: "Conservación y consultas",
          body: "Podemos conservar registros necesarios para operación, administración y atención postventa. Para consultar o pedir una corrección, contactanos por WhatsApp.",
        },
      ]}
    />
  );
}
