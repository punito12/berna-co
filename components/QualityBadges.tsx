import Reveal from "@/components/Reveal";

// "Por qué Berna&co" — the three pillars. Copy taken from the 2026 catalog
// ("Información y Calidad"). The eggs blurb has no benefits paragraph in the
// catalog, so it uses the catalog wording plus a short neutral line.
const PILLARS = [
  {
    title: "Huevos agroecológicos certificados",
    body: "Usamos huevos pastoriles de gallinas criadas en libertad y alimentadas de forma natural, sin agroquímicos. Más sabor, más nutrientes y una producción que cuida los animales y el ambiente.",
  },
  {
    title: "Marinadas durante 24 horas",
    body: "Marinamos durante 24 horas para lograr milanesas más tiernas, con el equilibrio perfecto de condimentos que realzan el sabor sin ser invasivos.",
  },
  {
    title: "Empanado simple",
    body: "Una alternativa más liviana, que no se despega y absorbe menos aceite.",
  },
];

export default function QualityBadges() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <Reveal className="mb-12 text-center">
          <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
            Por qué Berna&amp;co
          </p>
          <h2 className="mt-3 font-black uppercase tracking-tight text-4xl sm:text-5xl text-ink">
            Información y calidad
          </h2>
        </Reveal>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Reveal
              as="li"
              key={pillar.title}
              delay={i * 100}
              className="flex flex-col bg-white p-8 transition-colors hover:bg-cream"
            >
              <span className="font-serif text-3xl text-ink/25">0{i + 1}</span>
              <h3 className="mt-4 font-bold uppercase tracking-wide text-lg text-ink">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {pillar.body}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
