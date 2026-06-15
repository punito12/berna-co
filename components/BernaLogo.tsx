"use client";

/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { useState } from "react";

// Reusable brand logo. Renders the real logo image the owner uploaded to
// public/images/. Two versions keep it readable on any background:
//   - light: white/clear logo for dark backgrounds (hero, footer)
//   - dark:  black logo for light backgrounds (header, checkout, admin)
//
// Upload the files as:
//   public/images/logo-light.png
//   public/images/logo-dark.png
// (PNG with transparent background recommended.)

type BernaLogoProps = {
  variant?: "light" | "dark";
  size?: "sm" | "lg";
  className?: string;
  src?: string;
};

// Relación de aspecto intrínseca de los logos PNG (≈ 983×531). Se pasan
// width/height explícitos para reservar el espacio (sin layout shift) y que
// next/image sirva el logo redimensionado en vez del PNG original a tamaño
// completo. El alto real lo controlan las clases CSS (h-20/h-28/h-10) con
// width:auto.
const LOGO_W = 983;
const LOGO_H = 531;

function isSvg(url: string): boolean {
  return /\.svg(\?|#|$)/i.test(url);
}

export default function BernaLogo({
  variant = "dark",
  size = "lg",
  className = "",
  src,
}: BernaLogoProps) {
  const fallbackSrc =
    variant === "light"
      ? "/images/logo-light.png"
      : "/images/logo-dark.png";
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? src : fallbackSrc;

  // Height-based sizing; width scales automatically to keep the logo's ratio.
  const heightClass = size === "lg" ? "h-20 sm:h-28" : "h-10";
  const cls = `${heightClass} w-auto select-none ${className}`;

  // SVG: next/image no lo optimiza (y puede romper con remotos). Se sirve como
  // <img> con width/height explícitos (igual reserva espacio, sin layout shift).
  if (isSvg(imageSrc)) {
    return (
      <img
        src={imageSrc}
        alt="Berna&co"
        width={LOGO_W}
        height={LOGO_H}
        className={cls}
        onError={() => setFailed(true)}
      />
    );
  }

  // PNG/JPG: next/image lo redimensiona (AVIF/WebP) y agrega dimensiones.
  // El logo del hero (lg) está arriba de todo → priority; el chico puede ser lazy.
  return (
    <Image
      src={imageSrc}
      alt="Berna&co"
      width={LOGO_W}
      height={LOGO_H}
      priority={size === "lg"}
      sizes="(max-width: 640px) 160px, 210px"
      className={cls}
      onError={() => setFailed(true)}
    />
  );
}
