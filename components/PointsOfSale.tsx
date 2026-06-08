import Reveal from "@/components/Reveal";

// Points-of-sale section: embeds the shop's custom Google My Maps with every
// store that carries the products. Responsive (fills width, fixed aspect).
const MAP_SRC =
  "https://www.google.com/maps/d/u/0/embed?mid=1CRRd8EzBrKPIstPRUzWnWiaOeoeQOCE&ehbc=2E312F";

export default function PointsOfSale({
  eyebrow = "Dónde encontrarnos",
  title = "Puntos de venta",
  subtitle = "Conseguí nuestros productos en estos locales.",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section id="puntos-de-venta" className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <Reveal className="mb-10 text-center">
          <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-black uppercase tracking-tight text-4xl sm:text-5xl text-ink">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-md font-serif italic text-lg text-muted">
            {subtitle}
          </p>
        </Reveal>

        <Reveal className="overflow-hidden rounded-lg border border-line shadow-sm">
          {/* aspect-box keeps the map responsive (4:3 on desktop, taller on mobile) */}
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
            <iframe
              src={MAP_SRC}
              title="Puntos de venta de Berna&co"
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
