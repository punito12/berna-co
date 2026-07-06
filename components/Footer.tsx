import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import type { CSSProperties } from "react";

const legalLinks = [
  { href: "/confianza", label: "Cómo comprar" },
  { href: "/envios", label: "Envíos" },
  { href: "/cambios-devoluciones", label: "Cambios y devoluciones" },
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad" },
];

// Footer CRAV-style, de cero: marquee infinito del slogan, wordmark GIGANTE de
// borde a borde, contacto como píldoras y una línea legal mínima. Mantiene la
// firma de props (CmsHomeSection/CmsFooter siguen pasando lo mismo); los props
// de newsletter se aceptan pero ya no se usan.
export default function Footer({
  slogan = "¡La vida es rica!",
  instagram = "@berna.and.co",
  instagramUrl = "https://instagram.com/berna.and.co",
  email = "csberna2020@gmail.com",
  whatsapp = "+54 11 2545-0304",
  copyright = "© Berna&co. Todos los derechos reservados.",
  textKeys = {},
  sectionStyle,
  titleStyle,
}: {
  slogan?: string;
  instagram?: string;
  instagramUrl?: string;
  email?: string;
  whatsapp?: string;
  copyright?: string;
  logoUrl?: string;
  newsletterTitle?: string;
  newsletterSubtitle?: string;
  newsletterPlaceholder?: string;
  newsletterButton?: string;
  newsletterSuccess?: string;
  sectionStyle?: CSSProperties;
  titleStyle?: CSSProperties;
  textKeys?: Partial<Record<
    | "slogan"
    | "instagram"
    | "email"
    | "whatsapp"
    | "copyright"
    | "newsletterTitle"
    | "newsletterSubtitle"
    | "newsletterPlaceholder"
    | "newsletterButton",
    string
  >>;
}) {
  return (
    <footer
      data-cms-section="global.footer"
      style={sectionStyle}
      className="overflow-hidden bg-ink text-white"
    >
      {/* Marquee del slogan — cinta infinita */}
      <div className="border-b border-white/10 py-4 sm:py-5">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap pr-8">
          {/* Dos mitades idénticas para el loop sin costura */}
          {[0, 1].map((half) => (
            <div
              key={half}
              aria-hidden={half === 1}
              className="flex items-center gap-8"
            >
              {/* 12 repeticiones por mitad: cada mitad debe ser MÁS ancha que
                  cualquier viewport (incluso 4K), si no la cinta muestra un
                  hueco cuando "se queda sin texto". */}
              {Array.from({ length: 12 }).map((_, i) => (
                <Fragment key={i}>
                  <span
                    className="font-black uppercase tracking-tight text-xl sm:text-2xl"
                    data-cms-text={half === 0 && i === 0 ? textKeys.slogan : undefined}
                    style={titleStyle}
                  >
                    {slogan}
                  </span>
                  <span aria-hidden className="text-cream/40">
                    ✳
                  </span>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Etiqueta BERNA&CO (PNG con exterior transparente), centrada y
          contenida — no de borde a borde. */}
      <div className="px-4 pt-12 sm:pt-16">
        <div className="relative mx-auto aspect-[946/277] w-full max-w-xl">
          <Image
            src="/images/footer.png"
            alt="Berna&Co"
            fill
            sizes="576px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Contacto como píldoras */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 px-4 sm:mt-14">
        <a
          href={`https://wa.me/${BUSINESS_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          data-cms-text={textKeys.whatsapp}
          className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-ink transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          WhatsApp {whatsapp}
        </a>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-cms-text={textKeys.instagram}
          className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-white transition-all duration-200 hover:bg-white/10 active:scale-95"
        >
          {instagram}
        </a>
        <a
          href={`mailto:${email}`}
          data-cms-text={textKeys.email}
          className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-6 py-2.5 font-bold uppercase tracking-widest text-xs text-white transition-all duration-200 hover:bg-white/10 active:scale-95"
        >
          {email}
        </a>
      </div>

      {/* Legales + copyright */}
      <div className="mt-12 border-t border-white/10 px-4 py-6 sm:mt-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-cream/60 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p
            className="text-xs text-cream/50"
            data-cms-text={textKeys.copyright}
          >
            {copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
