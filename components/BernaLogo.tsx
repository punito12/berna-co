/* eslint-disable @next/next/no-img-element */

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
};

export default function BernaLogo({
  variant = "dark",
  size = "lg",
  className = "",
}: BernaLogoProps) {
  const src =
    variant === "light"
      ? "/images/logo-light.png"
      : "/images/logo-dark.png";

  // Height-based sizing; width scales automatically to keep the logo's ratio.
  const height = size === "lg" ? "h-20 sm:h-28" : "h-10";

  return (
    <img
      src={src}
      alt="Berna&co"
      className={`${height} w-auto select-none ${className}`}
    />
  );
}
