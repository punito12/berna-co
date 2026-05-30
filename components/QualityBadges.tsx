// Quality claims from the ROADMAP. A simple, austere strip — no icons,
// just bold uppercase labels separated by hairlines.
const BADGES = [
  "Marinadas 24 hs",
  "Huevos agroecológicos certificados",
  "Se cocinan directo desde el freezer",
  "Congeladas individualmente",
  "6 meses en freezer",
];

export default function QualityBadges() {
  return (
    <section className="border-y border-line bg-white">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-5">
        {BADGES.map((badge) => (
          <li
            key={badge}
            className="flex items-center justify-center bg-white px-4 py-6 text-center font-bold uppercase tracking-wide text-xs text-ink"
          >
            {badge}
          </li>
        ))}
      </ul>
    </section>
  );
}
