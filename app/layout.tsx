import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

// Archivo: a strong grotesque with a true black weight — fits the bold,
// catalog-like, uppercase personality of the brand without feeling generic.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Berna&co — Milanesas premium congeladas",
  description:
    "Milanesas premium artesanales, de nuestra cocina a tu freezer. LA VIDA ES RICA!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body className={archivo.className}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
