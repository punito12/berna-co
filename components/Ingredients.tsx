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
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
      {/* body */}
      <path
        d="M22 30a14 14 0 0 1 28 0c0 9-6 16-14 16-2.5 0-5-.7-7-2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* head */}
      <circle cx="22" cy="22" r="7" stroke="currentColor" strokeWidth="2.5" />
      {/* comb */}
      <path
        d="M19 15c1-3 5-3 6 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* beak */}
      <path
        d="M15 22l-5 1 5 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* eye */}
      <circle cx="22" cy="21" r="1.4" fill="currentColor" />
      {/* legs */}
      <path
        d="M30 46v6m8-6v6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CowIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" aria-hidden>
      {/* head outline */}
      <path
        d="M20 24c0-6 5-10 12-10s12 4 12 10c0 4-2 7-5 9 0 4-3 8-7 8s-7-4-7-8c-3-2-5-5-5-9Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* horns / ears */}
      <path
        d="M20 24c-4-1-7-4-7-8m31 8c4-1 7-4 7-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* eyes */}
      <circle cx="26" cy="26" r="1.6" fill="currentColor" />
      <circle cx="38" cy="26" r="1.6" fill="currentColor" />
      {/* nostrils */}
      <circle cx="29" cy="38" r="1.3" fill="currentColor" />
      <circle cx="35" cy="38" r="1.3" fill="currentColor" />
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
