import Reveal from "@/components/Reveal";

// Quality claims from the ROADMAP. An austere strip — bold uppercase labels
// over hairline separators, each numbered like a catalog spec sheet.
const BADGES = [
  "Marinadas 24 hs",
  "Huevos agroecológicos certificados",
  "Se cocinan directo desde el freezer",
  "Congeladas individualmente",
  "6 meses en freezer",
];

export default function QualityBadges() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Reveal className="mb-10 text-center">
          <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
            Por qué Berna&amp;co
          </p>
        </Reveal>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {BADGES.map((badge, i) => (
            <Reveal
              as="li"
              key={badge}
              delay={i * 80}
              className="group flex flex-col items-center justify-center gap-3 bg-white px-5 py-8 text-center transition-colors hover:bg-cream"
            >
              <span className="font-serif text-2xl text-ink/30">
                0{i + 1}
              </span>
              <span className="font-bold uppercase tracking-wide text-xs text-ink">
                {badge}
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
