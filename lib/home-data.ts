// Datos cacheados de la HOME pública. La home es dinámica (lee cookies/preview),
// así que sin esto cada visita corría ~7 queries a Neon (sa-east-1) antes de
// pintar nada → retrasaba el LCP en mobile. Acá cacheamos los datos PUBLICADOS
// (cross-request, vía unstable_cache) para que el render no espere a la DB en
// cada request. El cache se invalida con revalidateTag("home-data") al publicar
// desde el CMS, y se auto-revalida cada 5 min por las dudas.
//
// IMPORTANTE: esto NO toca getPaymentConfig/getAvailableProducts originales (que
// usan checkout/orders y el admin con datos frescos). Es un loader aparte solo
// para la home pública, y solo para el camino SIN preview.

import { unstable_cache, revalidateTag } from "next/cache";
import { getAvailableProducts, type ProductForUI } from "@/lib/products";
import {
  getPaymentConfig,
  type PaymentMethodConfigValues,
} from "@/lib/payment-config";
import { loadCmsBundle, type CmsBundle } from "@/lib/cms";

export const HOME_DATA_TAG = "home-data";

// Invalida la cache de datos de la home. Llamar después de cualquier mutación
// del admin que cambie lo que se muestra en la home pública (producto: nombre,
// imagen, precio web/efectivo, stock/disponibilidad, visibilidad, orden, promos
// por cantidad). Así el cambio se ve al instante en vez de esperar el revalidate
// de 5 min. No cambia ninguna lógica de negocio: solo refresca el cache.
export function revalidateHomeData() {
  revalidateTag(HOME_DATA_TAG);
}

// Forma serializable del CmsBundle (los Map no se pueden cachear → arrays).
type SerializableCmsBundle = {
  texts: [string, CmsBundle["texts"] extends Map<string, infer V> ? V : never][];
  images: [string, { url: string; urlDraft: string }][];
  content: CmsBundle["content"];
  sections: (Omit<CmsBundle["sections"][number], "updatedAt"> & {
    updatedAt: string;
  })[];
};

type HomeDataRaw = {
  products: ProductForUI[];
  payCfg: PaymentMethodConfigValues;
  bundle: SerializableCmsBundle;
};

// Loader cacheado: trae los datos de la home y los devuelve serializables.
const loadHomeDataRaw = unstable_cache(
  async (): Promise<HomeDataRaw> => {
    const [products, payCfg, bundle] = await Promise.all([
      getAvailableProducts(),
      getPaymentConfig(),
      loadCmsBundle(),
    ]);
    return {
      products,
      payCfg,
      bundle: {
        texts: [...bundle.texts.entries()],
        images: [...bundle.images.entries()],
        content: bundle.content,
        sections: bundle.sections.map((s) => ({
          ...s,
          updatedAt: s.updatedAt.toISOString(),
        })),
      },
    };
  },
  ["home-data-v1"],
  { tags: [HOME_DATA_TAG], revalidate: 300 }
);

export type HomeData = {
  products: ProductForUI[];
  payCfg: PaymentMethodConfigValues;
  cms: CmsBundle;
};

// Reconstruye el CmsBundle (con Maps + Date) desde la forma serializable.
function rebuildBundle(b: SerializableCmsBundle): CmsBundle {
  return {
    texts: new Map(b.texts),
    images: new Map(b.images),
    content: b.content,
    sections: b.sections.map((s) => ({
      ...s,
      updatedAt: new Date(s.updatedAt),
    })),
  };
}

export async function loadHomeData(): Promise<HomeData> {
  const raw = await loadHomeDataRaw();
  return {
    products: raw.products,
    payCfg: raw.payCfg,
    cms: rebuildBundle(raw.bundle),
  };
}
