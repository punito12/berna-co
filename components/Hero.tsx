import BernaLogo from "@/components/BernaLogo";

// Dark hero. Background photo (the catalog shot of stacked milanesas on a
// wooden board) lives at /public/images/hero.jpg. Until it's added, the solid
// black background shows on its own — no broken image.
export default function Hero() {
  return (
    <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4 py-24 text-center">
      {/* Background photo with a slow drift + flat dark overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 animate-slow-zoom bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
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
        Milanesas
        <br />
        Premium
      </h1>

      <p
        className="mt-6 animate-fade-up font-serif italic text-cream text-xl sm:text-2xl"
        style={{ animationDelay: "360ms" }}
      >
        de nuestra cocina a tu freezer
      </p>

      <a
        href="#productos"
        className="group mt-12 inline-flex animate-fade-up items-center gap-3 bg-white px-9 py-4 font-bold uppercase tracking-widest text-sm text-black transition-colors hover:bg-cream"
        style={{ animationDelay: "500ms" }}
      >
        Ver productos
        <span
          aria-hidden
          className="transition-transform duration-300 group-hover:translate-y-0.5"
        >
          ↓
        </span>
      </a>

      {/* Slogan banner pinned to the bottom of the hero */}
      <div
        className="absolute inset-x-0 bottom-0 animate-fade-up border-t border-white/15 py-4"
        style={{ animationDelay: "640ms" }}
      >
        <p className="font-black uppercase tracking-[0.35em] text-white text-sm sm:text-base">
          ¡La vida es rica!
        </p>
      </div>
    </section>
  );
}
