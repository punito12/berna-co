import type { Metadata } from "next";
import { Archivo, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

// Archivo: a strong grotesque with a true black weight — carries the bold,
// catalog-like uppercase headlines and all UI text.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

// Fraunces: a characterful "old style" serif with a beautiful italic. Used
// sparingly for editorial accent lines (e.g. "de nuestra cocina a tu freezer")
// to add refinement against the grotesque headlines.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
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
    <html lang="es-AR" className={`${archivo.variable} ${fraunces.variable}`}>
      <body className="font-sans">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
