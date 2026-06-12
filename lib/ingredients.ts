export type IngredientSlug =
  | "huevos"
  | "pollo-pastoril"
  | "peceto-de-pastura";

export type IngredientPage = {
  slug: IngredientSlug;
  href: string;
  titleKey: string;
  introKey: string;
  bodyKey: string;
  fallbackTitle: string;
  fallbackIntro: string;
  fallbackBody: string;
};

export type IngredientCmsText = {
  key: string;
  value: string;
  maxLength: number;
  category: string;
};

export const INGREDIENT_PAGES: IngredientPage[] = [
  {
    slug: "huevos",
    href: "/ingredientes/huevos",
    titleKey: "ingredient.huevos.title",
    introKey: "ingredient.huevos.intro",
    bodyKey: "ingredient.huevos.body",
    fallbackTitle: "Huevos",
    fallbackIntro:
      "Un ingrediente simple, noble y versatil que aporta textura, sabor y calidad a nuestras preparaciones.",
    fallbackBody:
      "Usamos huevos seleccionados para lograr preparaciones mas ricas, consistentes y equilibradas. Este texto es editable desde el CMS.",
  },
  {
    slug: "pollo-pastoril",
    href: "/ingredientes/pollo-pastoril",
    titleKey: "ingredient.pollo.title",
    introKey: "ingredient.pollo.intro",
    bodyKey: "ingredient.pollo.body",
    fallbackTitle: "Pollo Pastoril",
    fallbackIntro:
      "Una base de sabor suave y natural para productos pensados para todos los dias.",
    fallbackBody:
      "El pollo pastoril nos permite crear preparaciones practicas, sabrosas y faciles de cocinar. Este texto es editable desde el CMS.",
  },
  {
    slug: "peceto-de-pastura",
    href: "/ingredientes/peceto-de-pastura",
    titleKey: "ingredient.peceto.title",
    introKey: "ingredient.peceto.intro",
    bodyKey: "ingredient.peceto.body",
    fallbackTitle: "Peceto de Pastura",
    fallbackIntro:
      "Un corte magro, delicado y de gran calidad, ideal para preparaciones premium.",
    fallbackBody:
      "El peceto de pastura se destaca por su textura y sabor, y forma parte de nuestra seleccion de ingredientes cuidados. Este texto es editable desde el CMS.",
  },
];

export const INGREDIENT_CMS_TEXTS: IngredientCmsText[] = INGREDIENT_PAGES.flatMap(
  (page) => [
    {
      key: page.titleKey,
      value: page.fallbackTitle,
      maxLength: 60,
      category: "home",
    },
    {
      key: page.introKey,
      value: page.fallbackIntro,
      maxLength: 220,
      category: "home",
    },
    {
      key: page.bodyKey,
      value: page.fallbackBody,
      maxLength: 2000,
      category: "home",
    },
  ]
);

export function getIngredientPage(slug: string): IngredientPage | undefined {
  return INGREDIENT_PAGES.find((page) => page.slug === slug);
}
