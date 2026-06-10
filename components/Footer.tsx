import BernaLogo from "@/components/BernaLogo";
import NewsletterForm from "@/components/NewsletterForm";
import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";

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
}) {
  return (
    <footer className="bg-ink text-white">
      {/* Slogan banner with hairline rules */}
      <div className="border-b border-white/10 px-4 py-10 text-center">
        <p className="font-black uppercase tracking-[0.32em] text-lg sm:text-2xl sm:tracking-[0.4em]">
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
        />
      </div>

      {/* Logo + contact */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
          <BernaLogo variant="light" size="sm" src={logoUrl} />

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold uppercase tracking-widest text-xs text-cream transition-colors hover:text-white"
            >
              {instagram}
            </a>
            <a
              href={`mailto:${email}`}
              className="text-sm text-cream transition-colors hover:text-white"
            >
              {email}
            </a>
            <a
              href={`https://wa.me/${BUSINESS_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream transition-colors hover:text-white"
            >
              WhatsApp {whatsapp}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-cream/70">
        {copyright}
      </div>
    </footer>
  );
}
