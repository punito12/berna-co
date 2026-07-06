import { getSiteText, type CmsBundle } from "@/lib/cms";

// Labels del carrito flotante (CartOverlay es client component: los textos se
// resuelven en el server de cada página y bajan como props). Los templates
// usan {count} (unidades que faltan) y {pct} (porcentaje del tramo).
export type CartLabels = {
  title: string;
  tagline: string;
  empty: string;
  emptySub: string;
  viewProducts: string;
  cta: string;
  discountAchieved: string;
  discountApply: string;
  discountNext: string;
  discountMissing: string;
};

export function getCartLabels(cms: CmsBundle, preview = false): CartLabels {
  const t = (key: string, fb: string) => getSiteText(cms, key, fb, preview);
  return {
    title: t("cart.title", "Tu carrito"),
    tagline: t("cart.tagline", "Listas para tu freezer."),
    empty: t("cart.empty", "Tu carrito está vacío"),
    emptySub: t("cart.empty_sub", "Llenalo de milanesas."),
    viewProducts: t("cart.view_products", "Ver productos"),
    cta: t("cart.cta", "Finalizar pedido"),
    discountAchieved: t(
      "cart.discount_achieved",
      "¡Felicitaciones! Tenés {pct}% OFF"
    ),
    discountApply: t("cart.discount_apply", "Se aplica al total en el checkout."),
    discountNext: t(
      "cart.discount_next",
      "Sumá {count} más y pasás al {pct}% OFF."
    ),
    discountMissing: t(
      "cart.discount_missing",
      "Te faltan {count} para el {pct}% OFF"
    ),
  };
}
