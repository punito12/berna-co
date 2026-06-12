import Reveal from "@/components/Reveal";

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

function CowIcon() {
  // Pasture beef icon: side-profile animal, matching the chicken's line style.
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
      {/* body */}
      <path
        d="M13 36c0-8 7-14 18-14h12c7 0 12 5 12 12 0 8-6 14-16 14H24c-7 0-11-4-11-12Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* head + muzzle */}
      <path
        d="M45 24c3-5 8-7 13-4-2 5-5 8-10 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* horn + ear */}
      <path
        d="M48 21c1-4 4-7 8-8-1 4-3 6-6 8m-6 1-4-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* back + belly detail */}
      <path
        d="M20 30c5-3 13-3 19 0m-20 9h19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* legs + tail */}
      <path
        d="M24 48v7m14-7v7m-17 0h6m8 0h6M13 34l-5-4m0 0 2 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="23" r="1.4" fill="currentColor" />
      {/* pasture line */}
      <path
        d="M9 58h9m31 0h6M15 54l-3 4m38-4 3 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS = [EggIcon, ChickenIcon, CowIcon];

export default function Ingredients({
  eyebrow = "Lo que hay adentro",
  title = "Nuestros ingredientes",
  item1 = "Huevos de gallinas libres",
  item2 = "Pollo pastoril",
  item3 = "Peceto de pastura",
}: {
  eyebrow?: string;
  title?: string;
  item1?: string;
  item2?: string;
  item3?: string;
}) {
  const ITEMS = [item1, item2, item3].map((t, i) => ({
    title: t,
    Icon: ICONS[i],
  }));
  return (
    <section id="ingredientes" className="bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-24">
        <Reveal className="mb-10 text-center sm:mb-14">
          <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-black uppercase tracking-tight text-4xl leading-none text-ink sm:text-6xl">
            {title}
          </h2>
        </Reveal>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-[0_18px_45px_rgba(10,10,10,0.06)] sm:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal
              as="li"
              key={item.title}
              delay={i * 100}
              className="group flex flex-col items-center gap-4 bg-white px-6 py-8 text-center transition-all duration-300 hover:bg-cream sm:min-h-64 sm:gap-5 sm:py-12"
            >
              <span className="rounded-full border border-line bg-cream/60 p-4 text-ink transition-transform duration-300 group-hover:scale-105">
                <item.Icon />
              </span>
              <h3 className="font-black uppercase tracking-tight text-xl text-ink">
                {item.title}
              </h3>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
