// Seeds the CMS tables with the site's CURRENT hardcoded content, so the editor
// starts from the real values. Idempotent: upserts by key, never overwrites a
// value the admin already changed (only fills missing rows).
//
// Run: npx tsx prisma/seed-cms.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Current theme (from tailwind.config.ts) -------------------------------
const THEME_COLORS = {
  ink: "#0A0A0A", // black: hero bg, footer, buttons, strong text
  cream: "#F5F0EB", // soft alternate background
  line: "#E8E3DC", // borders, separators
  muted: "#6B6560", // secondary text
  accent: "#c0392b", // promo red
};

const TYPOGRAPHY = {
  headingFont: "Archivo",
  bodyFont: "Archivo",
  headingWeight: "900",
};

// --- Texts (key, value, maxLength, category) -------------------------------
const TEXTS: [string, string, number, string][] = [
  // Home · Hero
  ["home.hero.title", "Milanesas\nPremium", 60, "home"],
  ["home.hero.subtitle", "de nuestra cocina a tu freezer", 80, "home"],
  ["home.hero.cta", "Ver productos", 30, "home"],
  // Home · Ingredientes
  ["home.ingredients.eyebrow", "Lo que hay adentro", 40, "home"],
  ["home.ingredients.title", "Nuestros ingredientes", 50, "home"],
  ["home.ingredients.item1", "Huevos de gallinas libres", 50, "home"],
  ["home.ingredients.item2", "Pollo pastoril", 50, "home"],
  ["home.ingredients.item3", "Peceto de pastura", 50, "home"],
  // Home · Puntos de venta
  ["home.pos.eyebrow", "Dónde encontrarnos", 40, "home"],
  ["home.pos.title", "Puntos de venta", 40, "home"],
  ["home.pos.subtitle", "Conseguí nuestros productos en estos locales.", 100, "home"],
  // Catálogo
  ["catalogo.eyebrow", "Congelados Caseros", 40, "catalogo"],
  ["catalogo.title", "Nuestros productos", 50, "catalogo"],
  ["catalogo.subtitle", "Elegí tu corte y tu empanado. Listas para el horno.", 100, "catalogo"],
  ["catalogo.filter.all", "Todos", 20, "catalogo"],
  ["catalogo.outOfStock", "Sin stock", 30, "catalogo"],
  ["catalogo.empty", "No hay productos cargados todavía.", 80, "catalogo"],
  // Checkout · steps + buttons
  ["checkout.step.contact", "Tus datos", 40, "checkout"],
  ["checkout.step.delivery", "Entrega", 40, "checkout"],
  ["checkout.step.schedule", "Cuándo", 40, "checkout"],
  ["checkout.step.payment", "Pago", 40, "checkout"],
  ["checkout.step.summary", "Resumen", 40, "checkout"],
  ["checkout.cta.confirm", "Confirmar pedido", 40, "checkout"],
  ["checkout.cta.pay", "Ir a pagar", 40, "checkout"],
  ["checkout.emptyCart", "Tu carrito está vacío.", 60, "checkout"],
  ["checkout.confirmado.title", "¡Gracias!", 40, "checkout"],
  ["checkout.confirmado.subtitle", "Tu pedido quedó registrado. Confirmalo enviándonos el detalle por WhatsApp.", 160, "checkout"],
  // WhatsApp template (supports {pedidoId}, {total}, {cliente})
  ["checkout.whatsapp.template", "¡Hola Berna&co! Hice un pedido nuevo 🛒\nPedido #{pedidoId}\nCliente: {cliente}\nTotal: {total}", 400, "checkout"],
  // Footer + contacto
  ["footer.slogan", "¡La vida es rica!", 40, "footer"],
  ["footer.instagram", "@berna.and.co", 60, "footer"],
  ["footer.instagramUrl", "https://instagram.com/berna.and.co", 120, "footer"],
  ["footer.email", "csberna2020@gmail.com", 80, "footer"],
  ["footer.whatsapp", "+54 11 2545-0304", 40, "footer"],
  ["footer.copyright", "© Berna&co. Todos los derechos reservados.", 120, "footer"],
  // Legal
  ["legal.terms", "Términos y condiciones. (Editá este texto desde el panel.)", 5000, "legal"],
  ["legal.privacy", "Política de privacidad. (Editá este texto desde el panel.)", 5000, "legal"],
];

// --- Images (key, url, category) -------------------------------------------
const IMAGES: [string, string, string][] = [
  ["home.hero.background", "/images/hero.jpg", "home"],
  ["branding.logo", "", "branding"],
];

// --- Home sections (key, order, type) --------------------------------------
const SECTIONS: [string, number, string][] = [
  ["home.hero", 0, "hero"],
  ["home.ingredients", 1, "features"],
  ["home.products", 2, "products_grid"],
  ["home.pos", 3, "custom"],
  ["home.footer", 4, "custom"],
];

async function main() {
  // SiteContent singleton.
  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      themeColors: JSON.stringify(THEME_COLORS),
      themeColorsDraft: JSON.stringify(THEME_COLORS),
      typography: JSON.stringify(TYPOGRAPHY),
      typographyDraft: JSON.stringify(TYPOGRAPHY),
      publishedAt: new Date(),
    },
  });

  // Texts.
  for (const [key, value, maxLength, category] of TEXTS) {
    await prisma.siteText.upsert({
      where: { key },
      update: { maxLength, category }, // keep edited value; refresh metadata
      create: { key, value, valueDraft: value, maxLength, category },
    });
  }

  // Images.
  for (const [key, url, category] of IMAGES) {
    await prisma.siteImage.upsert({
      where: { key },
      update: { category },
      create: { key, url, urlDraft: url, category },
    });
  }

  // Sections.
  for (const [key, order, type] of SECTIONS) {
    const page = key.split(".")[0];
    await prisma.siteSection.upsert({
      where: { key },
      update: {},
      create: {
        key,
        page,
        order,
        orderDraft: order,
        visible: true,
        visibleDraft: true,
        type,
        config: "{}",
        configDraft: "{}",
      },
    });
  }

  const counts = {
    texts: await prisma.siteText.count(),
    images: await prisma.siteImage.count(),
    sections: await prisma.siteSection.count(),
  };
  console.log("CMS seed OK:", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
