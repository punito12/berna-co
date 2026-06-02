import BernaLogo from "@/components/BernaLogo";
import NewsletterForm from "@/components/NewsletterForm";
import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      {/* Slogan banner with hairline rules */}
      <div className="border-b border-white/10 py-10 text-center">
        <p className="font-black uppercase tracking-[0.4em] text-lg sm:text-2xl">
          ¡La vida es rica!
        </p>
      </div>

      {/* Newsletter */}
      <div className="mx-auto max-w-2xl px-4 py-14 text-center">
        <NewsletterForm />
      </div>

      {/* Logo + contact */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
          <BernaLogo variant="light" size="sm" />

          <div className="flex flex-col items-center gap-2 sm:items-end">
            <a
              href="https://instagram.com/berna.and.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold uppercase tracking-widest text-xs text-cream transition-colors hover:text-white"
            >
              @berna.and.co
            </a>
            <a
              href="mailto:csberna2020@gmail.com"
              className="text-sm text-cream transition-colors hover:text-white"
            >
              csberna2020@gmail.com
            </a>
            <a
              href={`https://wa.me/${BUSINESS_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream transition-colors hover:text-white"
            >
              WhatsApp +54 11 2545-0304
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
