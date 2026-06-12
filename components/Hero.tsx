import BernaLogo from "@/components/BernaLogo";

// Dark hero. Texts + background image come from the CMS (with the original
// hardcoded values as fallbacks).
export default function Hero({
  title = "Milanesas premium\ny congelados caseros",
  subtitle = "Elegí online, coordiná la entrega y pagá como prefieras.",
  cta = "Comprar ahora",
  backgroundUrl = "/images/hero.jpg",
  logoUrl = "",
  titleKey = "home.hero.title",
  subtitleKey = "home.hero.subtitle",
  ctaKey = "home.hero.cta_primary",
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  backgroundUrl?: string;
  logoUrl?: string;
  titleKey?: string;
  subtitleKey?: string;
  ctaKey?: string;
}) {
  // Title may contain a newline (rendered as <br/>).
  const titleLines = title.split("\n");
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-ink px-4 py-16 text-center sm:min-h-screen sm:py-24">
      {/* Background photo with a slow drift + flat dark overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 animate-slow-zoom bg-cover bg-center"
        style={{ backgroundImage: `url('${backgroundUrl}')` }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/65" />

      {/* Thin catalog-style frame inset from the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 -z-10 border border-white/15 sm:inset-6"
      />

      <div className="animate-soft-pop" style={{ animationDelay: "80ms" }}>
        <BernaLogo variant="light" size="lg" src={logoUrl} />
      </div>

      <h1
        data-cms-text={titleKey}
        className="mt-10 animate-fade-up font-black uppercase tracking-tight text-white text-[3.3rem] leading-[0.86] sm:mt-12 sm:text-8xl"
        style={{ animationDelay: "220ms" }}
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
        className="mt-6 animate-fade-up font-serif italic text-cream text-xl sm:text-2xl"
        style={{ animationDelay: "360ms" }}
      >
        {subtitle}
      </p>

      <a
        href="#productos"
        data-cms-text={ctaKey}
        className="group mt-9 inline-flex animate-fade-up items-center gap-3 bg-white px-9 py-4 font-bold uppercase tracking-widest text-sm text-black shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-cream hover:shadow-[0_22px_50px_rgba(0,0,0,0.3)] active:translate-y-0 sm:mt-12"
        style={{ animationDelay: "500ms" }}
      >
        {cta}
        <span
          aria-hidden
          className="transition-transform duration-300 group-hover:translate-y-0.5"
        >
          ↓
        </span>
      </a>

      <div
        className="mt-8 grid w-full max-w-3xl animate-fade-up grid-cols-1 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 text-left text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:grid-cols-3"
        style={{ animationDelay: "620ms" }}
      >
        {[
          ["01", "Elegí tus productos"],
          ["02", "Coordiná la entrega"],
          ["03", "Pagá como prefieras"],
        ].map(([step, text]) => (
          <div key={step} className="bg-black/25 px-4 py-3 backdrop-blur-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-cream/65">
              {step}
            </span>
            <p className="mt-1 font-bold uppercase tracking-tight text-sm">
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
