import BernaLogo from "@/components/BernaLogo";

// Dark hero. Texts + background image come from the CMS (with the original
// hardcoded values as fallbacks).
export default function Hero({
  title = "Milanesas\nPremium",
  subtitle = "de nuestra cocina a tu freezer",
  cta = "Ver productos",
  backgroundUrl = "/images/hero.jpg",
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  backgroundUrl?: string;
}) {
  // Title may contain a newline (rendered as <br/>).
  const titleLines = title.split("\n");
  return (
    <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4 py-24 text-center">
      {/* Background photo with a slow drift + flat dark overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 animate-slow-zoom bg-cover bg-center"
        style={{ backgroundImage: `url('${backgroundUrl}')` }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/60" />

      {/* Thin catalog-style frame inset from the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-4 -z-10 border border-white/15 sm:inset-6"
      />

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <BernaLogo variant="light" size="lg" />
      </div>

      <h1
        className="mt-12 animate-fade-up font-black uppercase tracking-tight text-white text-[3.25rem] leading-[0.88] sm:text-8xl"
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
        className="mt-6 animate-fade-up font-serif italic text-cream text-xl sm:text-2xl"
        style={{ animationDelay: "360ms" }}
      >
        {subtitle}
      </p>

      <a
        href="#productos"
        className="group mt-12 inline-flex animate-fade-up items-center gap-3 bg-white px-9 py-4 font-bold uppercase tracking-widest text-sm text-black transition-colors hover:bg-cream"
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
    </section>
  );
}
