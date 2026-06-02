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
  // A chicken drumstick: meaty top + bone with two knobs at the end.
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
      {/* meat */}
      <path
        d="M40 14c7 0 12 5 12 12 0 6-4 10-9 11l-3 3a7 7 0 0 1-10-10l3-3c1-5 5-9 10-9Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* bone */}
      <path
        d="M30 34 18 46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* bone knobs at the end */}
      <circle cx="15" cy="45" r="3.5" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="19" cy="49" r="3.5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function CowIcon() {
  // A front-facing cow face: ears, horns, muzzle and eyes.
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
      {/* ears */}
      <path
        d="M19 24c-6-2-9 0-11 4 4 3 8 3 11 1m23-5c6-2 9 0 11 4-4 3-8 3-11 1"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* horns */}
      <path
        d="M22 18c-2-4-1-8 1-10 1 3 3 5 5 6m13 4c2-4 1-8-1-10-1 3-3 5-5 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* head */}
      <path
        d="M20 22c0-5 5-8 12-8s12 3 12 8c0 6-2 9-4 12 3 1 4 4 4 7 0 5-5 9-12 9s-12-4-12-9c0-3 1-6 4-7-2-3-4-6-4-12Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* eyes */}
      <circle cx="27" cy="26" r="1.8" fill="currentColor" />
      <circle cx="37" cy="26" r="1.8" fill="currentColor" />
      {/* muzzle line + nostrils */}
      <path
        d="M24 44h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="29" cy="40" r="1.4" fill="currentColor" />
      <circle cx="35" cy="40" r="1.4" fill="currentColor" />
    </svg>
  );
}

const ITEMS = [
  { title: "Huevos de gallinas libres", Icon: EggIcon },
  { title: "Pollo pastoril", Icon: ChickenIcon },
  { title: "Peceto de pastura", Icon: CowIcon },
];

export default function Ingredients() {
  return (
    <section id="ingredientes" className="bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
        <Reveal className="mb-14 text-center">
          <p className="font-bold uppercase tracking-[0.3em] text-xs text-muted">
            Lo que hay adentro
          </p>
          <h2 className="mt-3 font-black uppercase tracking-tight text-4xl sm:text-6xl text-ink">
            Nuestros ingredientes
          </h2>
        </Reveal>

        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal
              as="li"
              key={item.title}
              delay={i * 100}
              className="flex flex-col items-center gap-5 bg-white px-6 py-12 text-center transition-colors hover:bg-cream"
            >
              <span className="text-ink">
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
