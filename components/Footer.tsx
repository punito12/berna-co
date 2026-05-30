import BernaLogo from "@/components/BernaLogo";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink px-4 py-16 text-center text-white">
      {/* Oversized faint slogan as a backdrop — texture, on-palette */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-black uppercase tracking-tight text-white/[0.04] text-[18vw] leading-none"
      >
        Berna &amp; Co
      </p>

      <div className="relative">
        <BernaLogo variant="light" size="sm" className="mx-auto" />

        <p className="mt-8 font-black uppercase tracking-[0.35em] text-xl">
          ¡La vida es rica!
        </p>

        <a
          href="https://instagram.com/berna.and.co"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block font-bold uppercase tracking-widest text-xs text-cream transition-colors hover:text-white"
        >
          @berna.and.co
        </a>
      </div>
    </footer>
  );
}
