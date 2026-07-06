import Reveal from "@/components/Reveal";

// Points-of-sale section: embeds the shop's custom Google My Maps with every
// store that carries the products. Responsive (fills width, fixed aspect).
const MAP_SRC =
  "https://www.google.com/maps/d/u/0/embed?mid=1CRRd8EzBrKPIstPRUzWnWiaOeoeQOCE&ehbc=2E312F";

export default function PointsOfSale({
  eyebrow = "Dónde encontrarnos",
  title = "Puntos de venta",
  subtitle = "Conseguí nuestros productos en estos locales.",
  mapSrc = MAP_SRC,
  eyebrowKey = "home.pos.eyebrow",
  titleKey = "home.pos.title",
  subtitleKey = "home.pos.subtitle",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  mapSrc?: string;
  eyebrowKey?: string;
  titleKey?: string;
  subtitleKey?: string;
}) {
  return (
    <section id="puntos-de-venta" className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-24">
        <Reveal className="reveal-quiet mb-8 text-center sm:mb-10">
          <p
            className="stamp-pop inline-block rounded-full bg-ink px-5 py-2 font-bold uppercase tracking-[0.25em] text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.2)]"
            data-cms-text={eyebrowKey}
          >
            {eyebrow}
          </p>
          <h2
            className="title-curtain mt-5 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-5xl"
            data-cms-text={titleKey}
          >
            <span className="title-slide">{title}</span>
          </h2>
          <p
            className="sub-fade mx-auto mt-4 max-w-md font-serif italic text-lg text-muted"
            data-cms-text={subtitleKey}
          >
            {subtitle}
          </p>
        </Reveal>

        <Reveal className="reveal-quiet">
          <div className="photo-reveal overflow-hidden rounded-lg border border-line bg-white shadow-[0_18px_45px_rgba(10,10,10,0.08)]">
          {/* aspect-box keeps the map responsive (4:3 on desktop, taller on mobile) */}
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
            <iframe
              src={mapSrc || MAP_SRC}
              title="Puntos de venta de Berna&co"
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0"
              allowFullScreen
            />
          </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
