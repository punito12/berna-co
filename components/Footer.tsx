import BernaLogo from "@/components/BernaLogo";

export default function Footer() {
  return (
    <footer className="bg-ink px-4 py-14 text-center text-white">
      <BernaLogo variant="light" size="sm" className="mx-auto" />

      <p className="mt-8 font-black uppercase tracking-[0.3em] text-lg">
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
    </footer>
  );
}
