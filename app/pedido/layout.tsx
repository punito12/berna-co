import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedido",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PedidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
