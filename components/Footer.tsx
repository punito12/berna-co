import BernaLogo from "@/components/BernaLogo";
import NewsletterForm from "@/components/NewsletterForm";
import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";
import Link from "next/link";

const legalLinks = [
  { href: "/confianza", label: "Cómo comprar" },
  { href: "/envios", label: "Envíos" },
  { href: "/cambios-devoluciones", label: "Cambios y devoluciones" },
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad" },
];

export default function Footer({
  slogan = "¡La vida es rica!",
  instagram = "@berna.and.co",
  instagramUrl = "https://instagram.com/berna.and.co",
  email = "csberna2020@gmail.com",
  whatsapp = "+54 11 2545-0304",
  copyright = "© Berna&co. Todos los derechos reservados.",
  logoUrl = "",
  newsletterTitle = "Sumate al newsletter",
  newsletterSubtitle = "Novedades, recetas y promos. Sin spam.",
  newsletterPlaceholder = "tu@email.com",
  newsletterButton = "Sumarme",
  newsletterSuccess = "¡Gracias! Te vas a enterar de las novedades.",
  textKeys = {},
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
    <footer className="bg-ink text-white">
      {/* Slogan banner with hairline rules */}
      <div className="border-b border-white/10 px-4 py-10 text-center">
        <p
          className="font-black uppercase tracking-[0.32em] text-lg sm:text-2xl sm:tracking-[0.4em]"
          data-cms-text={textKeys.slogan}
        >
          {slogan}
        </p>
      </div>

      {/* Newsletter */}
      <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:py-16">
        <NewsletterForm
          title={newsletterTitle}
          subtitle={newsletterSubtitle}
          placeholder={newsletterPlaceholder}
          buttonLabel={newsletterButton}
          successMessage={newsletterSuccess}
          textKeys={{
            title: textKeys.newsletterTitle,
            subtitle: textKeys.newsletterSubtitle,
            placeholder: textKeys.newsletterPlaceholder,
            button: textKeys.newsletterButton,
          }}
        />
      </div>

      {/* Logo + contact */}
      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 text-center sm:grid-cols-[1fr_auto_auto] sm:items-start sm:text-left">
          <BernaLogo variant="light" size="sm" src={logoUrl} />

          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
              Información
            </p>
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-cream transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold uppercase tracking-widest text-xs text-cream transition-colors hover:text-white"
              data-cms-text={textKeys.instagram}
            >
              {instagram}
            </a>
            <a
              href={`mailto:${email}`}
              className="text-sm text-cream transition-colors hover:text-white"
              data-cms-text={textKeys.email}
            >
              {email}
            </a>
            <a
              href={`https://wa.me/${BUSINESS_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream transition-colors hover:text-white"
              data-cms-text={textKeys.whatsapp}
            >
              WhatsApp {whatsapp}
            </a>
          </div>
        </div>
      </div>
      <div
        className="border-t border-white/10 px-4 py-4 text-center text-xs text-cream/70"
        data-cms-text={textKeys.copyright}
      >
        {copyright}
      </div>
    </footer>
  );
}
