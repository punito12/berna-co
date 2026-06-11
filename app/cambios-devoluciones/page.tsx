import type { Metadata } from "next";
import LegalInfoPage from "@/components/LegalInfoPage";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Cambios, devoluciones y cancelaciones",
  description:
    "Criterios generales para cambios, devoluciones y cancelaciones de pedidos en Berna&co.",
  alternates: {
    canonical: absoluteUrl("/cambios-devoluciones"),
  },
};

export default function ReturnsPage() {
  return (
    <LegalInfoPage
      eyebrow={SITE_NAME}
      title="Cambios, devoluciones y cancelaciones"
      intro="Trabajamos con alimentos congelados, por eso revisamos cada caso cuidando la seguridad y el estado de los productos."
      sections={[
        {
          title: "Cambios o inconvenientes",
          body: "Si recibiste un producto equivocado, dañado o con algún problema, escribinos por WhatsApp lo antes posible con el número de pedido y, si ayuda, fotos del producto recibido.",
        },
        {
          title: "Productos alimenticios",
          body: "Por tratarse de alimentos, los cambios o devoluciones dependen del estado del producto, la conservación de la cadena de frío y el momento en que se informa el inconveniente.",
        },
        {
          title: "Cancelaciones",
          body: "Las cancelaciones pueden solicitarse antes de que el pedido entre en preparación o despacho. Si el pedido ya fue preparado o enviado, revisaremos el caso por WhatsApp.",
        },
        {
          title: "Resolución",
          body: "Cuando corresponda, podremos coordinar reposición, ajuste del pedido o devolución del importe según el medio de pago utilizado y el estado de la operación.",
        },
      ]}
    />
  );
}
