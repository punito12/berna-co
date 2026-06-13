import type { MetadataRoute } from "next";
import { INGREDIENT_PAGES } from "@/lib/ingredients";
import { getAvailableProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

const staticPages = [
  { path: "/", priority: 1 },
  { path: "/confianza", priority: 0.6 },
  { path: "/envios", priority: 0.5 },
  { path: "/cambios-devoluciones", priority: 0.5 },
  { path: "/terminos", priority: 0.5 },
  { path: "/privacidad", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  let products: Awaited<ReturnType<typeof getAvailableProducts>> = [];

  try {
    products = await getAvailableProducts();
  } catch {
    products = [];
  }

  return [
    ...staticPages.map((page) => ({
      url: new URL(page.path, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: page.priority,
    })),
    ...INGREDIENT_PAGES.map((page) => ({
      url: new URL(page.href, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
    ...products.map((product) => ({
      url: new URL(`/producto/${product.slug}`, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
