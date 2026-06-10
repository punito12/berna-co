// Seed exhaustivo del CMS. Es idempotente: crea filas faltantes y actualiza
// metadata, pero no pisa contenido ya editado por el admin.
//
// Run: npm run db:seed:cms

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const THEME_COLORS = {
  ink: "#0A0A0A",
  cream: "#F5F0EB",
  line: "#E8E3DC",
  muted: "#6B6560",
  accent: "#c0392b",
  buttonBg: "#0A0A0A",
  buttonText: "#FFFFFF",
  bg: "#FFFFFF",
};

const TYPOGRAPHY = {
  headingFont: "Archivo",
  bodyFont: "Inter",
  headingWeight: "900",
};

const DEFAULT_LOGO = "/images/branding/logo.svg";

const TEXTS: [string, string, number, string][] = [
  // Home
  ["home.hero.eyebrow", "LA VIDA ES RICA!", 30, "home"],
  ["home.hero.title", "MILANESAS PREMIUM", 40, "home"],
  ["home.hero.subtitle", "de nuestra cocina a tu freezer", 80, "home"],
  ["home.hero.cta_primary", "Ver productos", 25, "home"],
  ["home.hero.cta_secondary", "Conocé más", 25, "home"],
  ["home.about.title", "BERNA & CO", 30, "home"],
  [
    "home.about.paragraph",
    "Berna & Co nace de nuestro amor por la comida rica, casera y práctica. Hacemos milanesas premium congeladas para que tengas siempre algo rico listo en el freezer, con ingredientes cuidados y el sabor de una comida hecha con tiempo.",
    500,
    "home",
  ],
  ["home.features.title", "Características", 40, "home"],
  ["home.features.item1.title", "Super Prácticas", 40, "home"],
  [
    "home.features.item1.text",
    "Milanesas premium congeladas de forma individual, listas para resolver una comida rica en minutos.",
    200,
    "home",
  ],
  ["home.features.item2.title", "Marinadas 24 hs", 40, "home"],
  [
    "home.features.item2.text",
    "Para lograr milanesas más tiernas, sabrosas y con una textura bien casera.",
    200,
    "home",
  ],
  ["home.features.item3.title", "Huevos agroecológicos", 40, "home"],
  [
    "home.features.item3.text",
    "Certificados, de la mejor calidad.",
    200,
    "home",
  ],
  ["home.features.item4.title", "Directo del freezer al horno", 40, "home"],
  [
    "home.features.item4.text",
    "Se pueden cocinar sin descongelar.",
    200,
    "home",
  ],
  ["home.products.section_title", "Nuestros productos", 40, "home"],
  ["home.products.subtitle", "Elegí tu favorita", 80, "home"],
  [
    "home.testimonials.section_title",
    "Lo que dicen nuestros clientes",
    60,
    "home",
  ],
  ["home.faq.section_title", "Preguntas frecuentes", 60, "home"],
  ["home.newsletter.title", "Recibí novedades", 40, "home"],
  [
    "home.newsletter.subtitle",
    "Suscribite y enterate de promos y productos nuevos",
    100,
    "home",
  ],
  ["home.newsletter.placeholder", "Tu email", 30, "home"],
  ["home.newsletter.button", "Suscribirme", 20, "home"],
  [
    "home.newsletter.success",
    "¡Gracias! Te vamos a mandar novedades pronto.",
    100,
    "home",
  ],

  // Legacy Home keys still consumed by the current storefront.
  ["home.hero.cta", "Ver productos", 30, "home"],
  ["home.ingredients.eyebrow", "Lo que hay adentro", 40, "home"],
  ["home.ingredients.title", "Nuestros ingredientes", 50, "home"],
  ["home.ingredients.item1", "Huevos de gallinas libres", 50, "home"],
  ["home.ingredients.item2", "Pollo pastoril", 50, "home"],
  ["home.ingredients.item3", "Peceto de pastura", 50, "home"],
  ["home.pos.eyebrow", "Dónde encontrarnos", 40, "home"],
  ["home.pos.title", "Puntos de venta", 40, "home"],
  [
    "home.pos.subtitle",
    "Conseguí nuestros productos en estos locales.",
    100,
    "home",
  ],

  // Catálogo
  ["catalog.page_title", "Productos", 40, "catalogo"],
  ["catalog.subtitle", "Elegí tu favorita", 80, "catalogo"],
  ["catalog.filter.all", "Todos", 20, "catalogo"],
  ["catalog.filter.carne", "Carne", 20, "catalogo"],
  ["catalog.filter.pollo", "Pollo", 20, "catalogo"],
  ["catalog.filter.cerdo", "Cerdo", 20, "catalogo"],
  ["catalog.filter.vegano", "Vegano", 20, "catalogo"],
  ["catalog.product.add_to_cart", "Agregar al carrito", 30, "catalogo"],
  ["catalog.product.out_of_stock", "Sin stock", 20, "catalogo"],
  ["catalog.product.choose_breadcrumb", "Elegí tu empanado", 30, "catalogo"],
  ["catalog.product.kg_label", "1 kg", 15, "catalogo"],
  ["catalog.empty.title", "No hay productos disponibles", 50, "catalogo"],
  ["catalog.empty.text", "Volvé a intentar más tarde", 80, "catalogo"],
  ["catalog.badge.new", "NEW", 10, "catalogo"],
  ["catalog.badge.promo", "OFERTA", 15, "catalogo"],

  // Legacy catalog keys still consumed by the current storefront.
  ["catalogo.eyebrow", "Congelados Caseros", 40, "catalogo"],
  ["catalogo.title", "Nuestros productos", 50, "catalogo"],
  [
    "catalogo.subtitle",
    "Elegí tu corte y tu empanado. Listas para el horno.",
    100,
    "catalogo",
  ],
  ["catalogo.filter.all", "Todos", 20, "catalogo"],
  ["catalogo.outOfStock", "Sin stock", 30, "catalogo"],
  ["catalogo.empty", "No hay productos cargados todavía.", 80, "catalogo"],

  // Checkout
  ["checkout.title", "Finalizar pedido", 40, "checkout"],
  ["checkout.step1.title", "Tus datos", 30, "checkout"],
  ["checkout.step1.name_label", "Nombre y apellido", 30, "checkout"],
  ["checkout.step1.phone_label", "Teléfono", 20, "checkout"],
  ["checkout.step1.email_label", "Email (opcional)", 30, "checkout"],
  ["checkout.step1.notes_label", "Comentarios", 30, "checkout"],
  ["checkout.step2.title", "Entrega", 30, "checkout"],
  ["checkout.step2.delivery_option", "Envío a domicilio", 30, "checkout"],
  ["checkout.step2.pickup_option", "Retiro en local", 30, "checkout"],
  ["checkout.step2.address_label", "Dirección", 30, "checkout"],
  [
    "checkout.step2.outside_zone",
    "Lo sentimos, por ahora no llegamos a tu zona.",
    150,
    "checkout",
  ],
  ["checkout.step3.title", "¿Cuándo lo querés recibir?", 50, "checkout"],
  ["checkout.step3.date_label", "Fecha", 20, "checkout"],
  ["checkout.step3.slot_label", "Horario", 20, "checkout"],
  ["checkout.step4.title", "Forma de pago", 30, "checkout"],
  ["checkout.step4.cash_label", "Efectivo al recibir", 30, "checkout"],
  ["checkout.step4.transfer_label", "Transferencia bancaria", 30, "checkout"],
  ["checkout.step4.mp_label", "Tarjeta (Mercado Pago)", 40, "checkout"],
  ["checkout.confirm_button", "Confirmar pedido", 30, "checkout"],
  ["checkout.transfer.title", "Transferencia bancaria", 40, "checkout"],
  [
    "checkout.transfer.instructions",
    "Transferí el monto exacto y mandanos el comprobante por WhatsApp para confirmar tu pedido.",
    200,
    "checkout",
  ],
  ["checkout.transfer.alias_label", "Alias", 20, "checkout"],
  ["checkout.transfer.copy_button", "Copiar alias", 30, "checkout"],
  [
    "checkout.transfer.whatsapp_button",
    "Enviar comprobante por WhatsApp",
    60,
    "checkout",
  ],
  ["checkout.success.title", "¡Pedido recibido!", 30, "checkout"],
  [
    "checkout.success.text",
    "Te vamos a contactar por WhatsApp para coordinar la entrega.",
    200,
    "checkout",
  ],
  [
    "checkout.help_button",
    "¿Necesitás ayuda? Hablá con nosotros por WhatsApp",
    80,
    "checkout",
  ],

  // Legacy checkout keys still consumed by the current storefront.
  ["checkout.step.contact", "Tus datos", 40, "checkout"],
  ["checkout.step.delivery", "Entrega", 40, "checkout"],
  ["checkout.step.schedule", "Cuándo", 40, "checkout"],
  ["checkout.step.payment", "Pago", 40, "checkout"],
  ["checkout.step.summary", "Resumen", 40, "checkout"],
  ["checkout.cta.confirm", "Confirmar pedido", 40, "checkout"],
  ["checkout.cta.pay", "Ir a pagar", 40, "checkout"],
  ["checkout.emptyCart", "Tu carrito está vacío.", 60, "checkout"],
  ["checkout.confirmado.title", "¡Gracias!", 40, "checkout"],
  [
    "checkout.confirmado.subtitle",
    "Tu pedido quedó registrado. Confirmalo enviándonos el detalle por WhatsApp.",
    160,
    "checkout",
  ],
  [
    "checkout.whatsapp.template",
    "¡Hola Berna&co! Hice un pedido nuevo 🛒\nPedido #{pedidoId}\nCliente: {cliente}\nTotal: {total}",
    400,
    "checkout",
  ],

  // Footer
  ["footer.tagline", "LA VIDA ES RICA!", 40, "footer"],
  ["footer.contact.title", "Contacto", 20, "footer"],
  ["footer.contact.whatsapp_label", "WhatsApp", 20, "footer"],
  ["footer.contact.email_label", "Email", 20, "footer"],
  ["footer.contact.instagram_label", "@berna.and.co", 30, "footer"],
  [
    "footer.legal.copyright",
    "© 2026 Berna & Co. Todos los derechos reservados.",
    100,
    "footer",
  ],
  ["footer.legal.terms_link", "Términos y condiciones", 40, "footer"],
  ["footer.legal.privacy_link", "Política de privacidad", 40, "footer"],

  // Legacy footer keys still consumed by the current storefront.
  ["footer.slogan", "¡La vida es rica!", 40, "footer"],
  ["footer.instagram", "@berna.and.co", 60, "footer"],
  ["footer.instagramUrl", "https://instagram.com/berna.and.co", 120, "footer"],
  ["footer.email", "csberna2020@gmail.com", 80, "footer"],
  ["footer.whatsapp", "+54 11 2545-0304", 40, "footer"],
  ["footer.copyright", "© Berna&co. Todos los derechos reservados.", 120, "footer"],

  // Legal
  ["legal.terms.title", "Términos y condiciones", 60, "legal"],
  [
    "legal.terms.body",
    "Estos términos y condiciones son un texto placeholder para el sitio de Berna & Co. El contenido final debe ser revisado y reemplazado por la marca antes de publicar el sitio.",
    10000,
    "legal",
  ],
  ["legal.privacy.title", "Política de privacidad", 60, "legal"],
  [
    "legal.privacy.body",
    "Esta política de privacidad es un texto placeholder para el sitio de Berna & Co. El contenido final debe ser revisado y reemplazado por la marca antes de publicar el sitio.",
    10000,
    "legal",
  ],
  ["legal.terms", "Términos y condiciones. (Editá este texto desde el panel.)", 5000, "legal"],
  ["legal.privacy", "Política de privacidad. (Editá este texto desde el panel.)", 5000, "legal"],
];

const IMAGES: [string, string, string][] = [
  ["home.hero.background", "/images/hero/milanesas-hero.jpg", "home"],
  ["home.about.image", "/images/about/cocina.jpg", "home"],
  ["home.features.background", "", "home"],
  ["home.testimonials.background", "", "home"],
  ["branding.logo", DEFAULT_LOGO, "branding"],
];

const SECTIONS: [string, number, string, boolean][] = [
  ["home.hero", 1, "hero", true],
  ["home.about", 2, "about", true],
  ["home.features", 3, "features", true],
  ["home.products", 4, "products_grid", true],
  ["home.testimonials", 5, "testimonials", false],
  ["home.faq", 6, "faq", false],
  ["home.newsletter", 7, "newsletter", true],

  // Legacy current-home sections; kept so the existing storefront keeps working
  // until the full public refactor maps the new section taxonomy.
  ["home.ingredients", 30, "features", true],
  ["home.pos", 40, "map", true],
  ["home.footer", 50, "footer", true],
];

function parseObject(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

async function seedSiteContent() {
  const existing = await prisma.siteContent.findUnique({
    where: { id: "singleton" },
  });
  const themeColors = {
    ...THEME_COLORS,
    ...parseObject(existing?.themeColors ?? "{}"),
  };
  const themeColorsDraft = {
    ...THEME_COLORS,
    ...parseObject(existing?.themeColorsDraft ?? "{}"),
  };
  const typography = {
    ...TYPOGRAPHY,
    ...parseObject(existing?.typography ?? "{}"),
  };
  const typographyDraft = {
    ...TYPOGRAPHY,
    ...parseObject(existing?.typographyDraft ?? "{}"),
  };
  const logoUrl = existing?.logoUrl || DEFAULT_LOGO;
  const logoUrlDraft = existing?.logoUrlDraft || logoUrl;

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: {
      themeColors: JSON.stringify(themeColors),
      themeColorsDraft: JSON.stringify(themeColorsDraft),
      typography: JSON.stringify(typography),
      typographyDraft: JSON.stringify(typographyDraft),
      logoUrl,
      logoUrlDraft,
    },
    create: {
      id: "singleton",
      themeColors: JSON.stringify(THEME_COLORS),
      themeColorsDraft: JSON.stringify(THEME_COLORS),
      typography: JSON.stringify(TYPOGRAPHY),
      typographyDraft: JSON.stringify(TYPOGRAPHY),
      logoUrl: DEFAULT_LOGO,
      logoUrlDraft: DEFAULT_LOGO,
      publishedAt: new Date(),
    },
  });
}

async function seedTexts() {
  for (const [key, value, maxLength, category] of TEXTS) {
    await prisma.siteText.upsert({
      where: { key },
      update: { maxLength, category },
      create: { key, value, valueDraft: value, maxLength, category },
    });
  }
}

async function seedImages() {
  for (const [key, url, category] of IMAGES) {
    await prisma.siteImage.upsert({
      where: { key },
      update: { url, urlDraft: url, category },
      create: { key, url, urlDraft: url, category },
    });
  }
}

async function seedSections() {
  for (const [key, order, type, visible] of SECTIONS) {
    const page = key.split(".")[0];
    await prisma.siteSection.upsert({
      where: { key },
      update: {
        page,
        order,
        orderDraft: order,
        visible,
        visibleDraft: visible,
        type,
      },
      create: {
        key,
        page,
        order,
        orderDraft: order,
        visible,
        visibleDraft: visible,
        type,
        config: "{}",
        configDraft: "{}",
      },
    });
  }
}

async function main() {
  await seedSiteContent();
  await seedTexts();
  await seedImages();
  await seedSections();

  const counts = {
    texts: await prisma.siteText.count(),
    images: await prisma.siteImage.count(),
    sections: await prisma.siteSection.count(),
  };
  console.log("CMS seed OK:", JSON.stringify(counts));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
