// Seeds the 8 real Berna&co products with placeholder price 0.
// Prices are loaded later by the admin (see ROADMAP). Run with: npm run db:seed
// Idempotent: re-running upserts by slug so it is safe to run multiple times.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedProduct = {
  name: string;
  description: string;
  slug: string;
  weightGrams: number;
  category: "CARNE" | "POLLO" | "CERDO" | "VEGANO";
  imageUrl: string;
  isNew: boolean;
  availableBreadcrumbs: Array<"TRADITIONAL" | "INTEGRAL" | "KETO">;
};

const products: SeedProduct[] = [
  // --- Línea Premium (1 kg) ---
  {
    name: "Peceto de Pastura",
    description:
      "Corte de carne vacuna de alta calidad, de animales criados a pasto.",
    slug: "peceto-pastura",
    weightGrams: 1000,
    category: "CARNE",
    imageUrl: "/images/productos/peceto-pastura.jpg",
    isNew: true,
    availableBreadcrumbs: ["TRADITIONAL", "KETO"],
  },
  {
    name: "Peceto",
    description: "Carne de novillos, de primera calidad.",
    slug: "peceto",
    weightGrams: 1000,
    category: "CARNE",
    imageUrl: "/images/productos/peceto.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL"],
  },
  {
    name: "Pechuga Pastoril",
    description:
      "Pechuga de pollos criados en libertad y alimentados con granos. Sin hormonas ni antibióticos.",
    slug: "pechuga-pastoril",
    weightGrams: 1000,
    category: "POLLO",
    imageUrl: "/images/productos/pechuga-pastoril.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL", "KETO"],
  },
  {
    name: "Bife de Chorizo",
    description: "Corte prémium, magro y tierno, con gran sabor y textura.",
    slug: "bife-chorizo",
    weightGrams: 1000,
    category: "CARNE",
    imageUrl: "/images/productos/bife-chorizo.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL"],
  },
  {
    name: "Cerdo",
    description: "Elaboradas con carré fresco, calidad de exportación.",
    slug: "cerdo",
    weightGrams: 1000,
    category: "CERDO",
    imageUrl: "/images/productos/cerdo.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL"],
  },
  // --- Long Chicken Fingers (750 g) ---
  {
    name: "Long Chicken Fingers",
    description:
      "Mini supremitas 100% pechuga pastoril. Sin procesar. Sin conservantes.",
    slug: "long-chicken-fingers",
    weightGrams: 750,
    category: "POLLO",
    imageUrl: "/images/productos/long-chicken-fingers.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL"],
  },
  // --- Veganas (500 g) ---
  {
    name: "Berenjena",
    description: "Milanesa de berenjena.",
    slug: "berenjena",
    weightGrams: 500,
    category: "VEGANO",
    imageUrl: "/images/productos/berenjena.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL", "KETO"],
  },
  {
    name: "Gírgolas",
    description: "Milanesa de gírgolas.",
    slug: "girgolas",
    weightGrams: 500,
    category: "VEGANO",
    imageUrl: "/images/productos/girgolas.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL", "KETO"],
  },
];

// All 7 weekdays exist so the admin can toggle any of them. Mon/Wed/Fri start
// enabled, the rest disabled — the admin changes this from the panel.
const deliveryDays = [
  { dayOfWeek: 0, available: false }, // Sun
  { dayOfWeek: 1, available: true }, // Mon
  { dayOfWeek: 2, available: false }, // Tue
  { dayOfWeek: 3, available: true }, // Wed
  { dayOfWeek: 4, available: false }, // Thu
  { dayOfWeek: 5, available: true }, // Fri
  { dayOfWeek: 6, available: false }, // Sat
];

const deliverySlots = [
  { label: "10:00–12:00", available: true },
  { label: "12:00–14:00", available: true },
  { label: "16:00–18:00", available: true },
  { label: "18:00–20:00", available: true },
];

// Photo paths PER empanado. Each breadcrumb variant comes in different
// packaging, so it gets its own set of 2 photos, by naming convention:
//   TRADITIONAL: slug.jpg, slug-2.jpg
//   INTEGRAL:    slug-integral.jpg, slug-integral-2.jpg
//   KETO:        slug-keto.jpg, slug-keto-2.jpg
// Missing files render as cream placeholders, so listing them is always safe.
const BREADCRUMB_SUFFIX: Record<string, string> = {
  TRADITIONAL: "",
  INTEGRAL: "-integral",
  KETO: "-keto",
};

function galleryFor(
  slug: string,
  breadcrumbs: string[]
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const b of breadcrumbs) {
    const s = BREADCRUMB_SUFFIX[b] ?? "";
    out[b] = [
      `/images/productos/${slug}${s}.jpg`,
      `/images/productos/${slug}${s}-2.jpg`,
    ];
  }
  return out;
}

async function main() {
  for (const p of products) {
    const images = JSON.stringify(galleryFor(p.slug, p.availableBreadcrumbs));
    // Starting stock of 10 per empanado (admin adjusts from the panel).
    const stocks: Record<string, number> = {};
    for (const b of p.availableBreadcrumbs) stocks[b] = 10;
    const stocksJson = JSON.stringify(stocks);
    const totalStock = Object.values(stocks).reduce((a, b) => a + b, 0);

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        weightGrams: p.weightGrams,
        category: p.category,
        imageUrl: p.imageUrl,
        images,
        isNew: p.isNew,
        availableBreadcrumbs: JSON.stringify(p.availableBreadcrumbs),
      },
      create: {
        name: p.name,
        description: p.description,
        slug: p.slug,
        weightGrams: p.weightGrams,
        category: p.category,
        price: 0, // placeholder — admin loads real price
        stock: totalStock,
        stocks: stocksJson,
        imageUrl: p.imageUrl,
        images,
        isNew: p.isNew,
        availableBreadcrumbs: JSON.stringify(p.availableBreadcrumbs),
      },
    });
  }
  console.log(`Seeded ${products.length} products.`);

  // Ensure all 7 weekdays exist (so the admin can toggle any). Create missing
  // ones with their default availability; never overwrite the admin's choices.
  for (const d of deliveryDays) {
    await prisma.availableDeliveryDay.upsert({
      where: { dayOfWeek: d.dayOfWeek },
      update: {}, // keep whatever the admin set
      create: d,
    });
  }
  console.log(`Ensured ${deliveryDays.length} delivery days.`);

  if ((await prisma.deliverySlot.count()) === 0) {
    await prisma.deliverySlot.createMany({ data: deliverySlots });
    console.log(`Seeded ${deliverySlots.length} delivery slots.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
