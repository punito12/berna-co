import Reveal from "@/components/Reveal";
import { INGREDIENT_PAGES } from "@/lib/ingredients";
import Link from "next/link";

// "Nuestros ingredientes" — three pillars, each with a hand-drawn line icon in
// the brand's black/line style. Title only (no body copy).

function EggIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-16 sm:w-16" fill="none" aria-hidden>
      <path
        d="M32 6c-9 0-17 14-17 27a17 17 0 1 0 34 0C49 20 41 6 32 6Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 38a8 8 0 0 0 8 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChickenIcon() {
  // A pasture chicken: whole bird, comb, beak, wing and a small ground line.
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-16 sm:w-16" fill="none" aria-hidden>
      {/* body */}
      <path
        d="M18 38c0-10 8-18 19-18 9 0 16 6 16 15 0 8-7 14-17 14H22c-6 0-10-4-10-9 0-4 2-7 6-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* neck + head */}
      <path
        d="M38 21c1-6 5-10 11-10 4 0 7 3 7 7 0 3-2 6-5 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* comb + beak */}
      <path
        d="M45 11c0-3 2-5 4-5 0 3 1 5 3 7m4 5 5 2-5 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* wing */}
      <path
        d="M29 31c6 1 10 5 11 11-6 1-12-2-15-7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* eye */}
      <circle cx="50" cy="17" r="1.6" fill="currentColor" />
      {/* legs */}
      <path
        d="M28 49v6m10-6v6m-13 0h6m4 0h6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* pasture line */}
      <path
        d="M10 57h8m31 0h5M15 53l-3 4m38-5 3 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PecetoPasturaIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/peceto-pastura.svg"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      className="h-12 w-12 scale-150 object-contain transition-[filter] duration-300 group-hover:invert group-focus-within:invert sm:h-16 sm:w-16"
    />
  );
}

const ICONS = [EggIcon, ChickenIcon, PecetoPasturaIcon];

export default function Ingredients({
  eyebrow = "Lo que hay adentro",
  title = "Nuestros ingredientes",
  item1 = "Huevos de gallinas libres",
  item2 = "Pollo pastoril",
  item3 = "Peceto de pastura",
  previewToken,
}: {
  eyebrow?: string;
  title?: string;
  item1?: string;
  item2?: string;
  item3?: string;
  previewToken?: string;
}) {
  const ITEMS = [item1, item2, item3].map((t, i) => ({
    title: t,
    Icon: ICONS[i],
    href: previewToken
      ? `${INGREDIENT_PAGES[i].href}?preview=${encodeURIComponent(previewToken)}`
      : INGREDIENT_PAGES[i].href,
  }));
  return (
    <section
      id="ingredientes"
      data-cms-section="home.ingredients"
      className="bg-cream"
    >
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-24">
        {/* Header al lenguaje de hoy: sello estampado + cortina */}
        <Reveal className="reveal-quiet mb-10 text-center sm:mb-14">
          <p
            data-cms-text="home.ingredients.eyebrow"
            className="stamp-pop inline-block rounded-full bg-ink px-5 py-2 font-bold uppercase tracking-[0.25em] text-xs text-white shadow-[0_10px_30px_rgba(10,10,10,0.2)]"
          >
            {eyebrow}
          </p>
          <h2
            data-cms-text="home.ingredients.title"
            className="title-curtain mt-5 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl"
          >
            <span className="title-slide">{title}</span>
          </h2>
        </Reveal>

        {/* Cards sueltas que se INVIERTEN a tinta al hover (y con teclado):
            fondo negro, ícono y texto en blanco, CTA como píldora crema. */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {ITEMS.map((item, i) => (
            <Reveal
              as="li"
              key={item.title}
              delay={i * 100}
              className="group overflow-hidden rounded-3xl border border-line bg-white text-center text-ink shadow-[0_18px_45px_rgba(10,10,10,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-ink hover:bg-ink hover:text-white hover:shadow-[0_25px_60px_rgba(10,10,10,0.25)] focus-within:-translate-y-1 focus-within:border-ink focus-within:bg-ink focus-within:text-white sm:min-h-72"
            >
              <Link
                href={item.href}
                className="flex h-full flex-col items-center gap-3 px-4 py-6 outline-none sm:gap-6 sm:px-6 sm:py-12"
                aria-label={`Ver beneficios de ${item.title}`}
              >
                <span className="rounded-full border border-line bg-cream/60 p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:border-white/20 group-hover:bg-white/10 group-focus-within:border-white/20 group-focus-within:bg-white/10 sm:p-4">
                  <item.Icon />
                </span>
                <h3 className="flex items-center justify-center font-black uppercase tracking-tight text-base leading-tight sm:min-h-[3.5rem] sm:text-xl">
                  {item.title}
                </h3>
                <span
                  data-cms-button="ingredients.benefits"
                  className="inline-flex items-center rounded-full border border-ink px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 group-hover:border-cream group-hover:bg-cream group-hover:!text-ink group-focus-within:border-cream group-focus-within:bg-cream group-focus-within:!text-ink sm:text-xs"
                >
                  Ver beneficios
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
