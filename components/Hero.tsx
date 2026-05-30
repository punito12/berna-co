import BernaLogo from "@/components/BernaLogo";

// Dark hero. Background photo (the catalog shot of stacked milanesas on a
// wooden board) lives at /public/images/hero.jpg. Until it's added, the solid
// black background shows on its own — no broken image.
export default function Hero() {
  return (
    <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4 py-20 text-center">
      {/* Background photo + dark overlay */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/60" />

      <BernaLogo variant="light" size="lg" />

      <h1 className="mt-10 font-black uppercase tracking-tight text-white text-5xl sm:text-7xl leading-[0.9]">
        Milanesas
        <br />
        Premium
      </h1>

      <p className="mt-5 font-light italic text-cream text-lg sm:text-xl">
        de nuestra cocina a tu freezer
      </p>

      <a
        href="#productos"
        className="mt-10 inline-block bg-white px-8 py-4 font-bold uppercase tracking-widest text-sm text-black transition-colors hover:bg-cream"
      >
        Ver productos
      </a>

      {/* Slogan banner pinned to the bottom of the hero */}
      <div className="absolute inset-x-0 bottom-0 border-t border-white/15 py-4">
        <p className="font-black uppercase tracking-[0.3em] text-white text-sm sm:text-base">
          ¡La vida es rica!
        </p>
      </div>
    </section>
  );
}
