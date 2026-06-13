import Reveal from "@/components/Reveal";
import { INGREDIENT_PAGES } from "@/lib/ingredients";
import Link from "next/link";

// "Nuestros ingredientes" — three pillars, each with a hand-drawn line icon in
// the brand's black/line style. Title only (no body copy).

function EggIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
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
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
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
    <img
      src="/icons/peceto-pastura.svg"
      alt=""
      aria-hidden="true"
      className="h-16 w-16 scale-150 object-contain"
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
    <section id="ingredientes" className="bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-24">
        <Reveal className="mb-10 text-center sm:mb-14">
          <p
            data-cms-text="home.ingredients.eyebrow"
            className="font-bold uppercase tracking-[0.3em] text-xs text-muted"
          >
            {eyebrow}
          </p>
          <h2
            data-cms-text="home.ingredients.title"
            className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl"
          >
            {title}
          </h2>
        </Reveal>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-[0_18px_45px_rgba(10,10,10,0.06)] sm:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal
              as="li"
              key={item.title}
              delay={i * 100}
              className="group bg-white text-center transition-all duration-300 hover:bg-cream sm:min-h-64"
            >
              <Link
                href={item.href}
                className="flex h-full flex-col items-center gap-4 px-6 py-8 outline-none transition-colors focus-visible:bg-cream sm:gap-5 sm:py-12"
                aria-label={`Ver beneficios de ${item.title}`}
              >
                <span className="rounded-full border border-line bg-cream/60 p-4 text-ink transition-transform duration-300 group-hover:scale-105">
                  <item.Icon />
                </span>
                <h3 className="flex min-h-[3.5rem] items-center justify-center font-black uppercase tracking-tight text-xl leading-tight text-ink">
                  {item.title}
                </h3>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-accent transition-colors group-hover:text-ink">
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
