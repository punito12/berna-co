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
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL", "KETO"],
  },
  {
    name: "Peceto",
    description: "Carne de novillos, de primera calidad.",
    slug: "peceto",
    weightGrams: 1000,
    category: "CARNE",
    imageUrl: "/images/productos/peceto.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL"],
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
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL"],
  },
  {
    name: "Cerdo",
    description: "Elaboradas con carré fresco, calidad de exportación.",
    slug: "cerdo",
    weightGrams: 1000,
    category: "CERDO",
    imageUrl: "/images/productos/cerdo.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL", "INTEGRAL"],
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
    availableBreadcrumbs: ["TRADITIONAL"],
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
    availableBreadcrumbs: ["TRADITIONAL"],
  },
  {
    name: "Gírgolas",
    description: "Milanesa de gírgolas.",
    slug: "girgolas",
    weightGrams: 500,
    category: "VEGANO",
    imageUrl: "/images/productos/girgolas.jpg",
    isNew: false,
    availableBreadcrumbs: ["TRADITIONAL"],
  },
];

// Default delivery config (admin tweaks these later). Mon/Wed/Fri enabled.
const deliveryDays = [
  { dayOfWeek: 1, available: true },
  { dayOfWeek: 3, available: true },
  { dayOfWeek: 5, available: true },
];

const deliverySlots = [
  { label: "10:00–12:00", available: true },
  { label: "12:00–14:00", available: true },
  { label: "16:00–18:00", available: true },
  { label: "18:00–20:00", available: true },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        weightGrams: p.weightGrams,
        category: p.category,
        imageUrl: p.imageUrl,
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
        imageUrl: p.imageUrl,
        isNew: p.isNew,
        availableBreadcrumbs: JSON.stringify(p.availableBreadcrumbs),
      },
    });
  }
  console.log(`Seeded ${products.length} products.`);

  // Seed delivery days/slots only if none exist yet (avoid duplicating).
  if ((await prisma.availableDeliveryDay.count()) === 0) {
    await prisma.availableDeliveryDay.createMany({ data: deliveryDays });
    console.log(`Seeded ${deliveryDays.length} delivery days.`);
  }
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
