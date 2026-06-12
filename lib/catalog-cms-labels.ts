export type CatalogCmsLabel = {
  key: string;
  value: string;
  maxLength: number;
  category: string;
  label: string;
  group: "payment" | "cart" | "stock" | "detail";
};

export const CATALOG_CMS_LABELS: CatalogCmsLabel[] = [
  {
    key: "catalog.product.payment_cash_label",
    value: "efectivo",
    maxLength: 30,
    category: "catalogo",
    label: "Producto · chip efectivo",
    group: "payment",
  },
  {
    key: "catalog.product.payment_transfer_label",
    value: "transferencia",
    maxLength: 30,
    category: "catalogo",
    label: "Producto · chip transferencia",
    group: "payment",
  },
  {
    key: "catalog.product.payment_transfer_short_label",
    value: "transf.",
    maxLength: 20,
    category: "catalogo",
    label: "Producto · chip transferencia corto",
    group: "payment",
  },
  {
    key: "catalog.product.view_detail_label",
    value: "Ver detalle y fotos →",
    maxLength: 50,
    category: "catalogo",
    label: "Producto · link detalle",
    group: "detail",
  },
  {
    key: "catalog.cart.show_label",
    value: "Ver carrito",
    maxLength: 40,
    category: "catalogo",
    label: "Carrito · ver",
    group: "cart",
  },
  {
    key: "catalog.cart.hide_label",
    value: "Ocultar carrito",
    maxLength: 40,
    category: "catalogo",
    label: "Carrito · ocultar",
    group: "cart",
  },
  {
    key: "catalog.cart.continue_label",
    value: "Continuar",
    maxLength: 40,
    category: "catalogo",
    label: "Carrito · continuar",
    group: "cart",
  },
  {
    key: "catalog.product.low_stock_label",
    value: "Solo quedan {count} disponibles",
    maxLength: 80,
    category: "catalogo",
    label: "Producto · poco stock",
    group: "stock",
  },
  {
    key: "catalog.product.added_label",
    value: "Agregado ✓",
    maxLength: 40,
    category: "catalogo",
    label: "Producto · agregado",
    group: "stock",
  },
  {
    key: "catalog.product.added_detail_label",
    value: "Agregado al carrito ✓",
    maxLength: 60,
    category: "catalogo",
    label: "Detalle · agregado",
    group: "detail",
  },
  {
    key: "catalog.product.no_more_stock_label",
    value: "Sin más stock disponible",
    maxLength: 60,
    category: "catalogo",
    label: "Producto · sin más stock",
    group: "stock",
  },
  {
    key: "catalog.product.breadcrumb_label",
    value: "Empanado",
    maxLength: 30,
    category: "catalogo",
    label: "Producto · selector empanado",
    group: "detail",
  },
  {
    key: "catalog.product.out_of_stock_label_detail",
    value: "Sin stock",
    maxLength: 40,
    category: "catalogo",
    label: "Detalle · sin stock",
    group: "detail",
  },
];

export function renderCmsTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}
