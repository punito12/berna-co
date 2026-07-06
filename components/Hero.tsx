import BernaLogo from "@/components/BernaLogo";
import HeroBackgroundCarousel, {
  type HeroBackgroundImage,
} from "@/components/HeroBackgroundCarousel";

// Dark hero. Texts + background image come from the CMS (with the original
// hardcoded values as fallbacks).
export default function Hero({
  title = "Milanesas premium\ny congelados caseros",
  subtitle = "Elegí online, coordiná la entrega y pagá como prefieras.",
  cta = "Comprar ahora",
  backgroundUrl = "/images/hero.jpg",
  carouselImages,
  logoUrl = "",
  titleKey = "home.hero.title",
  subtitleKey = "home.hero.subtitle",
  ctaKey = "home.hero.cta_primary",
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  backgroundUrl?: string;
  carouselImages?: HeroBackgroundImage[];
  logoUrl?: string;
  titleKey?: string;
  subtitleKey?: string;
  ctaKey?: string;
}) {
  // Title may contain a newline (rendered as <br/>).
  const titleLines = title.split("\n");
  return (
    <section
      data-cms-section="home.hero"
      // sticky top-0 z-0: el hero queda PINNEADO y el resto de la home (capa
      // z-10 opaca en page.tsx) se desliza por encima al scrollear.
      className="sticky top-0 z-0 isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-ink px-4 py-16 text-center sm:min-h-screen sm:py-24"
    >
      {/* Background photo with a slow drift + flat dark overlay for legibility */}
      <HeroBackgroundCarousel
        images={carouselImages}
        fallbackUrl={backgroundUrl}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/65" />

      <div>
        <BernaLogo variant="light" size="lg" src={logoUrl} />
      </div>

      <h1
        data-cms-text={titleKey}
        className="mt-10 font-black uppercase tracking-tight text-white text-[3.3rem] leading-[0.86] sm:mt-12 sm:text-8xl"
      >
        {titleLines.map((line, i) => (
          <span key={i}>
            {line}
            {i < titleLines.length - 1 && <br />}
          </span>
        ))}
      </h1>

      <p
        data-cms-text={subtitleKey}
        className="mt-6 font-serif italic text-cream text-xl sm:text-2xl"
      >
        {subtitle}
      </p>

      <a
        href="#productos"
        data-cms-text={ctaKey}
        data-cms-button="hero.primary"
        className="group mt-9 inline-flex items-center gap-3 rounded-lg bg-hero-btn-bg px-9 py-4 font-bold uppercase tracking-widest text-sm text-hero-btn-text shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(0,0,0,0.3)] active:translate-y-0 sm:mt-12"
      >
        {cta}
        <span
          aria-hidden
          className="transition-transform duration-300 group-hover:translate-y-0.5"
        >
          ↓
        </span>
      </a>
    </section>
  );
}
