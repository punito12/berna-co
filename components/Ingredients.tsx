import Reveal from "@/components/Reveal";

// "Nuestros ingredientes" — five items with verbatim copy from the owner.
// Two groups: the raw ingredients (eggs/chicken/beef) and the two breadcrumbs.
type Ingredient = {
  kicker: string; // small group label
  title: string;
  body: string;
};

const INGREDIENTS: Ingredient[] = [
  {
    kicker: "Materia prima",
    title: "Huevos de gallinas libres",
    body: "Seleccionamos cuidadosamente huevos de gallinas criadas en libertad, que pastorean libremente en pastos de alta calidad, libres de agroquímicos. Este entorno natural permite que las gallinas expresen su comportamiento innato al 100%. Por la noche, duermen en un gallinero cerrado para su protección, y al amanecer, salen temprano a disfrutar del rocío matinal. Los huevos de gallinas que pastorean presentan un perfil nutricional superior, con el doble de vitaminas A y D, así como una mayor cantidad de ácidos grasos saludables como el Omega 3.",
  },
  {
    kicker: "Materia prima",
    title: "Pollo pastoril",
    body: "Nuestro compromiso con el bienestar animal se refleja en la elección de pollo pastoril, criado a campo y que pastorea libremente durante todo el día. Estos pollos se crían sin el uso de antibióticos ni hormonas. La combinación de una nutrición óptima, un estilo de vida activo y espacios seguros y saludables garantiza que los pollos desarrollen un sistema inmunológico robusto y un alto nivel de bienestar a lo largo de su crianza.",
  },
  {
    kicker: "Materia prima",
    title: "Peceto de pastura",
    body: "Nuestros bovinos se alimentan exclusivamente de pasto durante toda su vida. La carne de pastura se distingue por su riqueza en nutrientes, incluyendo proteínas de alta calidad, grasas saludables, vitaminas y minerales. Ofrece un sabor más intenso y una textura más tierna. Además, la producción de este tipo de carnes es sostenible, ya que se maximiza el impacto positivo que estos herbívoros tienen en el suelo.",
  },
  {
    kicker: "Empanados",
    title: "Empanado integral",
    body: "Elaborado con harina integral de trigo, centeno y cebada orgánicas, avena arrollada orgánica y una mezcla de semillas de chía, lino, quinoa, sésamo y girasol.",
  },
  {
    kicker: "Empanados",
    title: "Empanado keto",
    body: "Hecho con harina de almendras, queso parmesano, sésamo, aceite de oliva, sal marina, tomillo, romero y pimienta.",
  },
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

        <div className="divide-y divide-line border-y border-line">
          {INGREDIENTS.map((item, i) => (
            <Reveal
              key={item.title}
              delay={(i % 2) * 80}
              className="grid grid-cols-1 gap-4 py-10 sm:grid-cols-[auto_1fr] sm:gap-10"
            >
              {/* Big catalog-style number */}
              <div className="flex items-start gap-4 sm:w-44">
                <span className="font-black leading-none text-5xl sm:text-6xl text-ink/15">
                  0{i + 1}
                </span>
                <span className="mt-2 hidden font-bold uppercase tracking-[0.2em] text-[10px] text-muted sm:block">
                  {item.kicker}
                </span>
              </div>

              <div>
                <p className="mb-1 font-bold uppercase tracking-[0.2em] text-[10px] text-muted sm:hidden">
                  {item.kicker}
                </p>
                <h3 className="font-black uppercase tracking-tight text-2xl sm:text-3xl text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink/75">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
