import type { MetadataRoute } from "next";
import { getAvailableProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

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
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...products.map((product) => ({
      url: new URL(`/producto/${product.slug}`, siteUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
