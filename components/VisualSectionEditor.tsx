"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CmsTextField from "@/components/CmsTextField";
import CmsImageField from "@/components/CmsImageField";
import CatalogDesignPanel from "@/components/CatalogDesignPanel";
import HomeBlockPanel, {
  type HomeBlockBoundTextField,
  type HomeBlockTextBinding,
} from "@/components/HomeBlockPanel";
import { parseBlockConfig, type CmsBlockConfig } from "@/lib/cms-blocks";
import type { CmsDesignTarget } from "@/lib/cms-design";

// Datos que el editor visual recibe del server (mismas filas del CMS actual).
export type VisualSectionData = {
  key: string;
  type: string;
  configDraft: string;
};
export type VisualTextRow = {
  key: string;
  value: string;
  valueDraft: string;
  style: string;
  styleDraft: string;
  maxLength: number;
};

// Etiquetas humanas para los textos del footer (reusa las keys del CMS actual).
const FOOTER_LABELS: Record<string, string> = {
  "footer.slogan": "Slogan",
  "footer.email": "Email",
  "footer.whatsapp": "WhatsApp (texto)",
  "footer.instagram": "Instagram (texto)",
  "footer.instagramUrl": "Instagram (link)",
  "footer.copyright": "Copyright",
};
const FOOTER_KEYS = Object.keys(FOOTER_LABELS);

// Newsletter (suscripción del pie). Keys SiteText existentes (categoría "home").
const NEWSLETTER_LABELS: Record<string, string> = {
  "home.newsletter.title": "Título",
  "home.newsletter.subtitle": "Texto",
  "home.newsletter.placeholder": "Placeholder del email",
  "home.newsletter.button": "Texto del botón",
};
const NEWSLETTER_KEYS = Object.keys(NEWSLETTER_LABELS);

// Etiquetas humanas de los textos editables de la sección Productos (catálogo).
const PRODUCT_LABELS: Record<string, string> = {
  "catalog.product.add_to_cart": "Texto del botón Agregar",
  "catalog.product.added_label": "Texto de “Agregado”",
  "catalog.product.view_detail_label": "Texto de “Ver detalle y fotos”",
  "catalog.product.out_of_stock": "Texto de “Sin stock”",
  "catalog.product.low_stock_label": "Texto de “Poco stock”",
};
const PRODUCT_KEYS = Object.keys(PRODUCT_LABELS);

// Etiquetas humanas de los textos de las tarjetas / filtros / compra (catálogo).
const CATALOG_FILTER_LABELS: Record<string, string> = {
  "catalog.filter.all": "Texto del filtro “Todos”",
};
const CATALOG_CARD_LABELS: Record<string, string> = {
  "catalog.product.add_to_cart": "Texto del botón Agregar",
  "catalog.product.added_label": "Texto de “Agregado”",
  "catalog.product.view_detail_label": "Texto de “Ver detalle y fotos”",
  "catalog.product.out_of_stock": "Texto de “Sin stock”",
  "catalog.product.low_stock_label": "Texto de “Poco stock”",
  "catalog.product.no_more_stock_label": "Texto de “Sin más stock”",
  "catalog.badge.new": "Etiqueta “NEW”",
};
const CATALOG_PURCHASE_LABELS: Record<string, string> = {
  "catalog.product.choose_breadcrumb": "Texto “Elegí tu empanado”",
  "catalog.product.breadcrumb_label": "Etiqueta del selector de empanado",
  "catalog.product.payment_cash_label": "Etiqueta de pago en efectivo",
  "catalog.product.payment_transfer_label": "Etiqueta de transferencia",
  "catalog.product.payment_transfer_short_label": "Transferencia (corto)",
};
const CATALOG_CART_LABELS: Record<string, string> = {
  "catalog.cart.show_label": "Texto “Ver carrito”",
  "catalog.cart.hide_label": "Texto “Ocultar carrito”",
  "catalog.cart.continue_label": "Texto “Continuar”",
};

// ---- Detalle de producto (reusa keys SiteText existentes) ----
const PRODUCT_BACK_LABELS: Record<string, string> = {
  "catalog.page_title": "Texto de “Volver a productos”",
};
const PRODUCT_PURCHASE_LABELS: Record<string, string> = {
  "catalog.product.add_to_cart": "Texto del botón Agregar",
  "catalog.product.added_detail_label": "Texto de “Agregado al carrito”",
};
const PRODUCT_BREADING_LABELS: Record<string, string> = {
  "catalog.product.choose_breadcrumb": "Texto “Elegí tu empanado”",
  "catalog.product.breadcrumb_label": "Etiqueta del selector de empanado",
};
const PRODUCT_STOCK_LABELS: Record<string, string> = {
  "catalog.product.out_of_stock_label_detail": "Texto de “Sin stock”",
  "catalog.product.low_stock_label": "Texto de “Poco stock”",
  "catalog.product.no_more_stock_label": "Texto de “Sin más stock”",
};

// ---- Carrito / barra sticky (reusa keys SiteText existentes) ----
const CART_STICKY_LABELS: Record<string, string> = {
  "catalog.cart.show_label": "Texto “Ver carrito”",
  "catalog.cart.hide_label": "Texto “Ocultar carrito”",
};
const CART_ACTIONS_LABELS: Record<string, string> = {
  "catalog.cart.continue_label": "Texto del botón “Continuar”",
};

// Nota común: la barra de carrito solo aparece en el sitio al agregar productos.
const CART_VISIBILITY_NOTE =
  "La barra de carrito aparece en el sitio recién al agregar productos. En la vista previa del editor no se muestra; igual podés editar sus textos acá.";

// ---- Checkout (reusa keys SiteText existentes, categoría "checkout") ----
const CHECKOUT_HEADER_LABELS: Record<string, string> = {
  "checkout.title": "Título de la página",
  "checkout.cart_label": "Etiqueta “Carrito”",
  "checkout.back": "Botón “Volver”",
  "checkout.emptyCart": "Mensaje de carrito vacío",
};
const CHECKOUT_CUSTOMER_LABELS: Record<string, string> = {
  "checkout.step1.title": "Título del paso",
  "checkout.step1.name_label": "Etiqueta nombre",
  "checkout.step1.name_placeholder": "Ejemplo nombre",
  "checkout.step1.phone_label": "Etiqueta teléfono",
  "checkout.step1.phone_placeholder": "Ejemplo teléfono",
  "checkout.step1.email_label": "Etiqueta email",
  "checkout.step1.email_placeholder": "Ejemplo email",
  "checkout.step1.notes_label": "Etiqueta comentarios",
  "checkout.step1.notes_placeholder": "Ejemplo comentarios",
};
const CHECKOUT_DELIVERY_LABELS: Record<string, string> = {
  "checkout.step2.title": "Título del paso",
  "checkout.step2.delivery_option": "Opción “Envío a domicilio”",
  "checkout.step2.pickup_option": "Opción “Pasar a retirar”",
  "checkout.step2.street_label": "Etiqueta calle",
  "checkout.step2.street_placeholder": "Ejemplo calle",
  "checkout.step2.locality_label": "Etiqueta localidad",
  "checkout.step2.locality_placeholder": "Ejemplo localidad",
  "checkout.step2.postal_label": "Etiqueta código postal",
  "checkout.step2.postal_placeholder": "Ejemplo código postal",
  "checkout.step2.verify_address": "Botón verificar dirección",
  "checkout.step2.checking_zone": "Verificando zona…",
  "checkout.step2.covered": "Dirección cubierta",
  "checkout.step2.not_located": "No se ubicó la dirección",
  "checkout.step2.outside_zone": "Fuera de zona",
};
const CHECKOUT_SCHEDULE_LABELS: Record<string, string> = {
  "checkout.step3.title": "Título del paso",
  "checkout.step3.date_label": "Etiqueta día",
  "checkout.step3.slot_label": "Etiqueta horario",
  "checkout.step3.verify_first": "Verificar zona primero",
  "checkout.step3.no_days": "Sin días configurados",
  "checkout.step3.no_slots": "Sin horarios disponibles",
};
const CHECKOUT_PAYMENT_LABELS: Record<string, string> = {
  "checkout.step4.title": "Título del paso",
  "checkout.step4.cash_label": "Efectivo · título",
  "checkout.step4.cash_subtitle": "Efectivo · subtítulo",
  "checkout.step4.transfer_label": "Transferencia · título",
  "checkout.step4.transfer_subtitle": "Transferencia · subtítulo",
  "checkout.step4.mp_label": "Mercado Pago · título",
  "checkout.step4.mp_subtitle": "Mercado Pago · subtítulo",
  "checkout.step4.mp_note": "Nota Mercado Pago",
  "checkout.transfer.title": "Transferencia · título del bloque",
  "checkout.transfer.instructions": "Transferencia · instrucciones",
};
const CHECKOUT_SUMMARY_LABELS: Record<string, string> = {
  "checkout.step.summary": "Título del resumen",
  "checkout.summary.subtotal": "Subtotal",
  "checkout.summary.promos": "Promos",
  "checkout.summary.quantity_discount": "Descuento por cantidad",
  "checkout.summary.shipping": "Envío",
  "checkout.summary.free": "Gratis",
  "checkout.summary.total": "Total",
};
const CHECKOUT_SUBMIT_LABELS: Record<string, string> = {
  "checkout.confirm_button": "Botón “Confirmar pedido”",
  "checkout.cta.confirm": "Botón confirmar (alternativo)",
  "checkout.cta.pay": "Botón “Ir a pagar”",
};
const CHECKOUT_MESSAGES_LABELS: Record<string, string> = {
  "checkout.validation.name": "Falta nombre",
  "checkout.validation.phone": "Falta teléfono",
  "checkout.validation.street": "Falta calle",
  "checkout.validation.locality": "Falta localidad",
  "checkout.validation.verify_address": "Verificar dirección",
  "checkout.validation.zone_error": "No se verificó la zona",
  "checkout.validation.date": "Falta día",
  "checkout.validation.slot": "Falta horario",
  "checkout.validation.connection": "Error de conexión",
  "checkout.validation.submit_error": "Error al guardar el pedido",
};
const CHECKOUT_VISIBILITY_NOTE =
  "El formulario del checkout aparece cuando hay productos en el carrito; en la vista previa del editor (carrito vacío) no se muestra, pero podés editar sus textos acá.";

// ---- Páginas de pedido (reusa keys SiteText existentes, categoría "checkout") ----
const ORDER_HEADER_LABELS: Record<string, string> = {
  "checkout.confirmado.title": "Título “¡Gracias!”",
  "checkout.confirmado.subtitle": "Subtítulo de confirmación",
  "checkout.success.title": "Título “Pedido recibido”",
};
const ORDER_STATUS_LABELS: Record<string, string> = {
  "checkout.transfer.title": "Transferencia · título",
};
const ORDER_SUMMARY_LABELS: Record<string, string> = {
  "checkout.step.summary": "Título del resumen",
  "checkout.summary.shipping": "Etiqueta envío",
  "checkout.summary.free": "Etiqueta gratis",
  "checkout.summary.total": "Etiqueta total",
};
const ORDER_DELIVERY_LABELS: Record<string, string> = {
  "checkout.step1.name_label": "Etiqueta nombre",
  "checkout.step1.phone_label": "Etiqueta teléfono",
  "checkout.step1.notes_label": "Etiqueta comentarios",
  "checkout.step2.title": "Título de entrega",
  "checkout.step2.address_label": "Etiqueta dirección",
  "checkout.step3.title": "Título de día y horario",
};
const ORDER_NEXT_STEPS_LABELS: Record<string, string> = {
  "checkout.transfer.title": "Transferencia · título",
  "checkout.transfer.instructions": "Transferencia · instrucciones",
  "checkout.transfer.alias_label": "Transferencia · etiqueta alias",
  "checkout.transfer.copy_button": "Transferencia · botón copiar",
};
// La vista previa abre /pedido/confirmado sin un pedido real → muestra el
// fallback. No creamos pedidos ni tocamos estados de pago.
const ORDER_VISIBILITY_NOTE =
  "La vista previa abre la página de pedido sin un pedido real, así que muestra el aviso de “no encontramos ese pedido”. Igual podés editar estos textos acá; se ven con un pedido real. No se crean pedidos ni se toca el estado de pago.";

// ---- SEO y compartir (reusa keys SiteText/SiteImage existentes, categoría "seo") ----
const SEO_GOOGLE_LABELS: Record<string, string> = {
  "seo.site.title": "Título del sitio",
  "seo.site.description": "Descripción para Google",
  "seo.home.title": "Portada · título",
  "seo.home.description": "Portada · descripción",
};
const SEO_SHARE_LABELS: Record<string, string> = {
  "seo.share.title": "Título al compartir (opcional)",
  "seo.share.description": "Descripción al compartir (opcional)",
};

// ---- Legales (reusa keys SiteText existentes, categoría "legal") ----
// Cada página legal tiene 3 keys: título, intro y contenido (multilínea).
function legalLabels(slug: string): Record<string, string> {
  return {
    [`legal.${slug}.title`]: "Título de la página",
    [`legal.${slug}.intro`]: "Texto de introducción",
    [`legal.${slug}.body`]: "Contenido de la página",
  };
}
const LEGAL_BODY_NOTE =
  "En “Contenido”, cada bloque empieza con su título en la primera línea y el texto debajo. Dejá una línea en blanco para separar un bloque del siguiente.";

// Qué edita cada sección del editor visual (Home / Global / Catálogo).
type SectionEditorKind =
  | { kind: "block"; blockKey: string; extraTextKeys?: string[] }
  | {
      kind: "text";
      intro: string;
      keys: string[];
      labels: Record<string, string>;
      note?: string;
      href?: string;
      hrefLabel?: string;
    }
  | { kind: "info"; text: string; href?: string; hrefLabel?: string };

const SECTION_EDITORS: Record<string, SectionEditorKind> = {
  "home.hero": { kind: "block", blockKey: "home.hero" },
  "home.products": {
    kind: "block",
    blockKey: "home.products",
    extraTextKeys: PRODUCT_KEYS,
  },
  "home.ingredients": { kind: "block", blockKey: "home.ingredients" },
  "global.footer": {
    kind: "text",
    intro: "Contacto, redes y textos del pie de página.",
    keys: FOOTER_KEYS,
    labels: FOOTER_LABELS,
  },
  "global.newsletter": {
    kind: "text",
    intro: "Suscripción que aparece en el pie del sitio.",
    keys: NEWSLETTER_KEYS,
    labels: NEWSLETTER_LABELS,
  },
  "global.whatsapp": {
    kind: "info",
    text: "El botón flotante de WhatsApp usa el número de contacto global del negocio (hoy fijo en el sitio). El texto visible de WhatsApp del pie se edita en “Footer / contacto”. Editar el número/mensaje del botón flotante queda pendiente.",
    href: "/admin/config/negocio",
    hrefLabel: "Datos del negocio",
  },
  "global.nav": {
    kind: "info",
    text: "Los links del header (Productos, Carrito) toman su texto de los textos del catálogo y del checkout. Por ahora se editan en Modo avanzado.",
    href: "/admin/editor/catalogo",
    hrefLabel: "Editar textos del catálogo",
  },
  "global.legal": {
    kind: "info",
    text: "Los links legales del pie y las páginas (Términos, Privacidad, Envíos, Cambios) hoy son contenido fijo. Conectarlos al editor queda pendiente; mientras tanto se ven en Legales.",
    href: "/admin/editor/legales",
    hrefLabel: "Ver Legales",
  },
  "global.top-banner": {
    kind: "info",
    text: "Este banner se genera desde Ventas → Promociones → “Descuento por cantidad de unidades”. No tiene textos propios en el editor del sitio.",
    href: "/admin/ventas/promociones",
    hrefLabel: "Ir a Promociones",
  },
  "global.header": {
    kind: "info",
    text: "El logo se edita en Marca y estilos. En la Home, la portada ya incluye el logo principal.",
    href: "/admin/editor/identidad",
    hrefLabel: "Ir a Marca y estilos",
  },
  "home.trust": {
    kind: "info",
    text: "Esta sección todavía no está mapeada en el editor visual. Por ahora se edita en Modo avanzado.",
    href: "/admin/editor/confianza",
    hrefLabel: "Editar en Modo avanzado",
  },

  // ---- Catálogo ----
  // El encabezado del catálogo usa el MISMO bloque que la sección Productos del
  // inicio (es lo que renderiza el público), así no se duplica el contenido.
  "catalog.header": { kind: "block", blockKey: "home.products" },
  "catalog.filters": {
    kind: "text",
    intro: "Texto del filtro general del catálogo.",
    keys: Object.keys(CATALOG_FILTER_LABELS),
    labels: CATALOG_FILTER_LABELS,
    note: "Las categorías reales de productos (Carne, Pollo, etc.) se editan desde Admin → Productos.",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "catalog.cards": {
    kind: "text",
    intro: "Textos visibles en las tarjetas de producto.",
    keys: Object.keys(CATALOG_CARD_LABELS),
    labels: CATALOG_CARD_LABELS,
    note: "Los nombres, precios, stock, categorías e imágenes reales de los productos se editan en Admin → Productos. Esta sección solo cambia textos visibles de las tarjetas.",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "catalog.purchase": {
    kind: "text",
    intro: "Selector de empanado y etiquetas de las formas de pago.",
    keys: Object.keys(CATALOG_PURCHASE_LABELS),
    labels: CATALOG_PURCHASE_LABELS,
    note: "Los descuentos por forma de pago se editan en Configuración → Métodos de pago.",
    href: "/admin/config/metodos-pago",
    hrefLabel: "Ir a Métodos de pago",
  },
  "catalog.cart": {
    kind: "text",
    intro: "Textos de la barra de carrito (aparece al sumar productos).",
    keys: Object.keys(CATALOG_CART_LABELS),
    labels: CATALOG_CART_LABELS,
  },

  // ---- Detalle de producto ----
  "product.back": {
    kind: "text",
    intro: "Texto del link para volver al catálogo.",
    keys: Object.keys(PRODUCT_BACK_LABELS),
    labels: PRODUCT_BACK_LABELS,
  },
  "product.gallery": {
    kind: "info",
    text: "Las imágenes reales del producto se editan en Admin → Productos.",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "product.info": {
    kind: "info",
    text: "Nombre, precio, stock, categoría e imágenes reales del producto se editan en Admin → Productos. (El texto “Precio por unidad” todavía es fijo: queda pendiente de conectar.)",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "product.purchase": {
    kind: "text",
    intro: "Textos del panel de compra.",
    keys: Object.keys(PRODUCT_PURCHASE_LABELS),
    labels: PRODUCT_PURCHASE_LABELS,
    note: "Los textos “Cantidad” y “Precio por unidad” todavía son fijos (pendiente). El stock, precio y la lógica del carrito no se editan acá.",
  },
  "product.breading": {
    kind: "text",
    intro: "Texto del selector de empanado.",
    keys: Object.keys(PRODUCT_BREADING_LABELS),
    labels: PRODUCT_BREADING_LABELS,
    note: "Los empanados disponibles de cada producto se editan en Admin → Productos.",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "product.stock": {
    kind: "text",
    intro: "Textos de disponibilidad y stock (mantené {count} si aparece).",
    keys: Object.keys(PRODUCT_STOCK_LABELS),
    labels: PRODUCT_STOCK_LABELS,
    note: "Los textos “Disponible” y “Quedan N disponibles” todavía son fijos (pendiente).",
  },
  "product.trust": {
    kind: "info",
    text: "Los bloques Envíos / Pagos / Dudas del detalle hoy son texto fijo. Conectarlos al editor queda pendiente.",
    href: "/admin/editor/confianza",
    hrefLabel: "Ver Confianza",
  },

  // ---- Carrito / barra sticky ----
  "cart.sticky": {
    kind: "text",
    intro: "Textos de la barra de carrito (parte de arriba).",
    keys: Object.keys(CART_STICKY_LABELS),
    labels: CART_STICKY_LABELS,
    note: CART_VISIBILITY_NOTE,
  },
  "cart.actions": {
    kind: "text",
    intro: "Botón para ir al checkout desde el carrito.",
    keys: Object.keys(CART_ACTIONS_LABELS),
    labels: CART_ACTIONS_LABELS,
    note: CART_VISIBILITY_NOTE,
  },
  "cart.item": {
    kind: "info",
    text: "Nombre, precio, imagen, stock y variantes reales del producto se editan en Admin → Productos. El prefijo “Empanado:” de cada línea hoy es fijo (pendiente de conectar).",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "cart.quantity": {
    kind: "info",
    text: "Los botones + / − de cantidad usan la lógica del carrito; no tienen textos editables. " +
      CART_VISIBILITY_NOTE,
    href: "/admin/editor/catalogo",
    hrefLabel: "Modo avanzado",
  },
  "cart.totals": {
    kind: "info",
    text: "El total del carrito se calcula automáticamente desde los productos y no es texto editable.",
    href: "/admin/editor/catalogo",
    hrefLabel: "Modo avanzado",
  },
  "cart.messages": {
    kind: "info",
    text: "La barra de carrito no muestra un mensaje de “carrito vacío” propio (simplemente no aparece sin productos). Los avisos de stock se editan en la sección Tarjetas de producto del Catálogo.",
    href: "/admin/editor/catalogo",
    hrefLabel: "Ir a Catálogo (Modo avanzado)",
  },

  // ---- Checkout ----
  "checkout.header": {
    kind: "text",
    intro: "Título de la pantalla, volver al carrito y carrito vacío.",
    keys: Object.keys(CHECKOUT_HEADER_LABELS),
    labels: CHECKOUT_HEADER_LABELS,
  },
  "checkout.customer": {
    kind: "text",
    intro: "Etiquetas del paso de datos del cliente.",
    keys: Object.keys(CHECKOUT_CUSTOMER_LABELS),
    labels: CHECKOUT_CUSTOMER_LABELS,
    note: CHECKOUT_VISIBILITY_NOTE,
  },
  "checkout.delivery": {
    kind: "text",
    intro: "Etiquetas de envío a domicilio, retiro y verificación de zona.",
    keys: Object.keys(CHECKOUT_DELIVERY_LABELS),
    labels: CHECKOUT_DELIVERY_LABELS,
    note: CHECKOUT_VISIBILITY_NOTE,
  },
  "checkout.schedule": {
    kind: "text",
    intro: "Etiquetas de día y horario de entrega.",
    keys: Object.keys(CHECKOUT_SCHEDULE_LABELS),
    labels: CHECKOUT_SCHEDULE_LABELS,
    note:
      "Los días/horarios disponibles se configuran en Configuración → Días y horarios. " +
      CHECKOUT_VISIBILITY_NOTE,
  },
  "checkout.payment": {
    kind: "text",
    intro: "Textos visibles de los métodos de pago.",
    keys: Object.keys(CHECKOUT_PAYMENT_LABELS),
    labels: CHECKOUT_PAYMENT_LABELS,
    note: "Los descuentos por forma de pago se configuran en Configuración → Métodos de pago (no acá).",
    href: "/admin/config/metodos-pago",
    hrefLabel: "Ir a Métodos de pago",
  },
  "checkout.summary": {
    kind: "text",
    intro: "Etiquetas del resumen del pedido (los montos se calculan solos).",
    keys: Object.keys(CHECKOUT_SUMMARY_LABELS),
    labels: CHECKOUT_SUMMARY_LABELS,
    note: CHECKOUT_VISIBILITY_NOTE,
  },
  "checkout.submit": {
    kind: "text",
    intro: "Textos de los botones finales del checkout.",
    keys: Object.keys(CHECKOUT_SUBMIT_LABELS),
    labels: CHECKOUT_SUBMIT_LABELS,
    note: "El texto “Procesando…” mientras se confirma es fijo (pendiente de conectar).",
  },
  "checkout.messages": {
    kind: "text",
    intro: "Mensajes de validación y errores (mantené {count} si aparece).",
    keys: Object.keys(CHECKOUT_MESSAGES_LABELS),
    labels: CHECKOUT_MESSAGES_LABELS,
    note: CHECKOUT_VISIBILITY_NOTE,
  },

  // ---- Páginas de pedido ----
  "order.header": {
    kind: "text",
    intro: "Títulos de la pantalla de pedido recibido.",
    keys: Object.keys(ORDER_HEADER_LABELS),
    labels: ORDER_HEADER_LABELS,
    note: ORDER_VISIBILITY_NOTE,
  },
  "order.status": {
    kind: "text",
    intro: "Encabezados de estado del pago.",
    keys: Object.keys(ORDER_STATUS_LABELS),
    labels: ORDER_STATUS_LABELS,
    note:
      "Los encabezados de “pago pendiente” y “pago rechazado” hoy son texto fijo (pendiente). No se cambia la lógica de estado de pago ni Mercado Pago. " +
      ORDER_VISIBILITY_NOTE,
  },
  "order.summary": {
    kind: "text",
    intro: "Etiquetas del resumen del pedido (los montos se calculan solos).",
    keys: Object.keys(ORDER_SUMMARY_LABELS),
    labels: ORDER_SUMMARY_LABELS,
    note: ORDER_VISIBILITY_NOTE,
  },
  "order.delivery": {
    kind: "text",
    intro: "Etiquetas de datos del cliente y entrega en el pedido.",
    keys: Object.keys(ORDER_DELIVERY_LABELS),
    labels: ORDER_DELIVERY_LABELS,
    note: ORDER_VISIBILITY_NOTE,
  },
  "order.next_steps": {
    kind: "text",
    intro: "Instrucciones y datos para pagar por transferencia.",
    keys: Object.keys(ORDER_NEXT_STEPS_LABELS),
    labels: ORDER_NEXT_STEPS_LABELS,
    note: ORDER_VISIBILITY_NOTE,
  },
  "order.actions": {
    kind: "info",
    text: "Los botones “Seguir comprando”, “Volver al inicio”, “Reintentar pago” y “Contactar por WhatsApp” de las páginas de pedido hoy son texto fijo (pendiente de conectar). No se cambian sus links ni su comportamiento.",
    href: "/admin/editor/checkout",
    hrefLabel: "Modo avanzado",
  },
  "order.help": {
    kind: "info",
    text: "El contacto por WhatsApp usa el número global del negocio. Se gestiona desde Global → WhatsApp / Datos del negocio (no se duplica acá).",
    href: "/admin/config/negocio",
    hrefLabel: "Datos del negocio",
  },

  // ---- SEO y compartir ----
  "seo.google": {
    kind: "text",
    intro: "Título y descripción para Google (sitio y portada).",
    keys: Object.keys(SEO_GOOGLE_LABELS),
    labels: SEO_GOOGLE_LABELS,
    note: "Esto afecta cómo puede aparecer la tienda en Google. Los cambios pueden tardar en verse.",
  },
  "seo.share": {
    kind: "text",
    intro: "Texto al pegar el link en WhatsApp, Instagram o Facebook.",
    keys: Object.keys(SEO_SHARE_LABELS),
    labels: SEO_SHARE_LABELS,
    note: "Si no hay texto específico para redes, se usa el título/descripción general de Google.",
  },
  "seo.products": {
    kind: "info",
    text: "Los nombres, precios, stock e imágenes de los productos (lo que Google puede mostrar de cada producto) se editan en Admin → Productos.",
    href: "/admin/productos",
    hrefLabel: "Ir a Productos",
  },
  "seo.indexing": {
    kind: "info",
    text: "El sitemap (/sitemap.xml), el robots (/robots.txt) y las URLs canónicas se generan automáticamente y no se editan acá. Que Google indexe los cambios puede tardar (Search Console).",
    href: "/admin/editor/seo",
    hrefLabel: "Modo avanzado",
  },

  // ---- Legales ----
  "legal.shipping": {
    kind: "text",
    intro: "Página /envios: zonas, horarios y costos de envío. " + LEGAL_BODY_NOTE,
    keys: Object.keys(legalLabels("envios")),
    labels: legalLabels("envios"),
  },
  "legal.returns": {
    kind: "text",
    intro:
      "Página /cambios-devoluciones: condiciones y proceso. " + LEGAL_BODY_NOTE,
    keys: Object.keys(legalLabels("cambios")),
    labels: legalLabels("cambios"),
  },
  "legal.terms": {
    kind: "text",
    intro: "Página /terminos: términos de uso de la tienda. " + LEGAL_BODY_NOTE,
    keys: Object.keys(legalLabels("terminos")),
    labels: legalLabels("terminos"),
  },
  "legal.privacy": {
    kind: "text",
    intro: "Página /privacidad: política y manejo de datos. " + LEGAL_BODY_NOTE,
    keys: Object.keys(legalLabels("privacidad")),
    labels: legalLabels("privacidad"),
  },
  "legal.help": {
    kind: "info",
    text: "El bloque “¿Tenés una consulta?” de las páginas legales usa el WhatsApp global del negocio. Se gestiona desde Global / Datos del negocio (no se duplica acá).",
    href: "/admin/config/negocio",
    hrefLabel: "Datos del negocio",
  },
  "legal.footer_links": {
    kind: "info",
    text: "Los enlaces legales del pie de página apuntan a /terminos, /privacidad, etc. Hoy son fijos; conectarlos al editor queda pendiente. El resto del footer se edita en Global → Footer.",
    href: "/admin/editor/footer",
    hrefLabel: "Editar Footer",
  },
};

const SAVE_HELPER =
  "Guardá los cambios como borrador (botón de cada campo) y publicalos arriba.";

function draftText(
  textByKey: Map<string, VisualTextRow>,
  key: string,
  fallback: string
): string {
  const row = textByKey.get(key);
  return row?.valueDraft || row?.value || fallback;
}

type StringBlockField =
  | "eyebrow"
  | "title"
  | "subtitle"
  | "body"
  | "ctaLabel"
  | "ctaHref"
  | "imageUrl"
  | "imageAlt"
  | "mapSrc";

function fillText(config: CmsBlockConfig, field: StringBlockField, value: string) {
  config[field] = value;
}

function resolveVisualBlockConfigDraft(
  sectionKey: string,
  configDraft: string,
  textByKey: Map<string, VisualTextRow>
): string {
  const config = parseBlockConfig(configDraft);

  // Son los mismos fallbacks públicos que usa CmsHomeSection. Si una sección
  // tiene configDraft vacío ("{}"), el sitio igual muestra estos SiteText;
  // el editor visual también debe mostrarlos en vez de campos vacíos.
  if (sectionKey === "home.products") {
    fillText(
      config,
      "eyebrow",
      draftText(textByKey, "catalogo.eyebrow", "Congelados Caseros")
    );
    fillText(
      config,
      "title",
      draftText(textByKey, "catalogo.title", "Nuestros productos")
    );
    fillText(
      config,
      "subtitle",
      draftText(
        textByKey,
        "catalogo.subtitle",
        "Elegí tu corte y tu empanado. Listas para el horno."
      )
    );
  }

  if (sectionKey === "home.hero") {
    fillText(
      config,
      "title",
      draftText(textByKey, "home.hero.title", "Milanesas premium\ny congelados caseros")
    );
    fillText(
      config,
      "subtitle",
      draftText(
        textByKey,
        "home.hero.subtitle",
        "Elegí online, coordiná la entrega y pagá como prefieras."
      )
    );
    fillText(
      config,
      "ctaLabel",
      draftText(textByKey, "home.hero.cta_primary", "Comprar ahora")
    );
  }

  if (sectionKey === "home.ingredients") {
    fillText(
      config,
      "eyebrow",
      draftText(textByKey, "home.ingredients.eyebrow", "Lo que hay adentro")
    );
    fillText(
      config,
      "title",
      draftText(textByKey, "home.ingredients.title", "Nuestros ingredientes")
    );
    const items = [...(config.items ?? [])];
    const titles = [
      draftText(textByKey, "home.ingredients.item1", "Huevos de gallinas libres"),
      draftText(textByKey, "home.ingredients.item2", "Pollo pastoril"),
      draftText(textByKey, "home.ingredients.item3", "Peceto de pastura"),
    ];
    for (let index = 0; index < titles.length; index += 1) {
      const current = items[index];
      if (!current?.title?.trim()) {
        items[index] = { ...(current ?? { title: "" }), title: titles[index] };
      }
    }
    config.items = items;
  }

  return JSON.stringify(config);
}

function textBinding(
  textByKey: Map<string, VisualTextRow>,
  key: string,
  fallback: string,
  target:
    | { kind: "field"; field: HomeBlockBoundTextField }
    | { kind: "itemTitle"; index: number }
): HomeBlockTextBinding | null {
  const row = textByKey.get(key);
  if (!row) return null;
  const base = {
    key,
    published: row.value || fallback,
    draft: row.valueDraft || row.value || fallback,
  };
  return target.kind === "field"
    ? { ...base, kind: "field", field: target.field }
    : { ...base, kind: "itemTitle", index: target.index };
}

function visualBlockTextBindings(
  sectionKey: string,
  textByKey: Map<string, VisualTextRow>
): HomeBlockTextBinding[] {
  const bindings: Array<HomeBlockTextBinding | null> = [];
  if (sectionKey === "home.products") {
    bindings.push(
      textBinding(textByKey, "catalogo.eyebrow", "Congelados Caseros", {
        kind: "field",
        field: "eyebrow",
      }),
      textBinding(textByKey, "catalogo.title", "Nuestros productos", {
        kind: "field",
        field: "title",
      }),
      textBinding(
        textByKey,
        "catalogo.subtitle",
        "Elegí tu corte y tu empanado. Listas para el horno.",
        { kind: "field", field: "subtitle" }
      )
    );
  }
  if (sectionKey === "home.hero") {
    bindings.push(
      textBinding(
        textByKey,
        "home.hero.title",
        "Milanesas premium\ny congelados caseros",
        { kind: "field", field: "title" }
      ),
      textBinding(
        textByKey,
        "home.hero.subtitle",
        "Elegí online, coordiná la entrega y pagá como prefieras.",
        { kind: "field", field: "subtitle" }
      ),
      textBinding(textByKey, "home.hero.cta_primary", "Comprar ahora", {
        kind: "field",
        field: "ctaLabel",
      })
    );
  }
  if (sectionKey === "home.ingredients") {
    bindings.push(
      textBinding(textByKey, "home.ingredients.eyebrow", "Lo que hay adentro", {
        kind: "field",
        field: "eyebrow",
      }),
      textBinding(textByKey, "home.ingredients.title", "Nuestros ingredientes", {
        kind: "field",
        field: "title",
      }),
      textBinding(
        textByKey,
        "home.ingredients.item1",
        "Huevos de gallinas libres",
        { kind: "itemTitle", index: 0 }
      ),
      textBinding(textByKey, "home.ingredients.item2", "Pollo pastoril", {
        kind: "itemTitle",
        index: 1,
      }),
      textBinding(textByKey, "home.ingredients.item3", "Peceto de pastura", {
        kind: "itemTitle",
        index: 2,
      })
    );
  }
  return bindings.filter((binding): binding is HomeBlockTextBinding =>
    Boolean(binding)
  );
}

export type VisualSeoImage = { key: string; published: string; draft: string };

export default function VisualSectionEditor({
  sectionId,
  selectedButton,
  selectedTextKey,
  selectedElement,
  designTarget,
  sections,
  texts,
  logoUrl,
  seoImage,
  siteIcon,
}: {
  sectionId: string;
  selectedButton?: string | null;
  selectedTextKey?: string | null;
  selectedElement?: string | null;
  designTarget?: CmsDesignTarget;
  sections: VisualSectionData[];
  texts: VisualTextRow[];
  logoUrl?: string;
  seoImage?: VisualSeoImage;
  siteIcon?: VisualSeoImage;
}) {
  const editor = SECTION_EDITORS[sectionId];
  const textByKey = new Map(texts.map((t) => [t.key, t]));
  const [seoImageDraft, setSeoImageDraft] = useState(seoImage?.draft ?? "");
  const [siteIconDraft, setSiteIconDraft] = useState(siteIcon?.draft ?? "");

  useEffect(() => {
    setSeoImageDraft(seoImage?.draft ?? "");
  }, [seoImage?.draft]);

  useEffect(() => {
    setSiteIconDraft(siteIcon?.draft ?? "");
  }, [siteIcon?.draft]);

  // SEO: imagen para compartir (reusa CmsImageField + el SiteImage existente).
  if (sectionId === "seo.image") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted">
          La imagen grande que aparece en la tarjeta al compartir el link.
        </p>
        <p className="rounded-lg border border-line bg-cream/40 px-3 py-2 text-xs leading-5 text-muted">
          Recomendado: 1200×630 px, JPG/PNG, con logo y producto visible.
        </p>
        {seoImage ? (
          <CmsImageField
            imageKey={seoImage.key}
            label="Imagen para compartir"
            published={seoImage.published}
            draft={seoImage.draft}
            onSaved={setSeoImageDraft}
          />
        ) : (
          <InfoPanel
            text="No pudimos cargar la imagen. Editala en Modo avanzado."
            href="/admin/editor/seo"
            hrefLabel="Abrir Modo avanzado"
          />
        )}
      </div>
    );
  }

  // SEO: favicon / icono del sitio (SiteImage dedicado).
  if (sectionId === "seo.site_icon") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted">
          El ícono chico del navegador y el que puede aparecer como circulito en
          Google. No es la imagen grande de compartir.
        </p>
        <p className="rounded-lg border border-line bg-cream/40 px-3 py-2 text-xs leading-5 text-muted">
          Recomendado: PNG cuadrado 512×512, simple y legible.
        </p>
        {siteIcon ? (
          <>
            <CmsImageField
              imageKey={siteIcon.key}
              label="Icono del sitio / favicon"
              published={siteIcon.published}
              draft={siteIcon.draft}
              onSaved={setSiteIconDraft}
            />
            <div className="rounded-xl border border-line bg-cream/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                Vista del icono
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
                  {siteIconDraft ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={siteIconDraft}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-muted">Sin icono</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-green-800">csberna.com.ar</p>
                  <p className="text-sm font-bold text-blue-800">
                    Berna&co
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <InfoPanel
            text="No pudimos cargar el icono. Editalo en Modo avanzado."
            href="/admin/editor/seo"
            hrefLabel="Abrir Modo avanzado"
          />
        )}
      </div>
    );
  }

  // SEO: vista previa (Google + tarjeta social), solo lectura, desde el borrador.
  if (sectionId === "seo.preview") {
    const draftOf = (k: string) => textByKey.get(k)?.valueDraft ?? "";
    const title =
      draftOf("seo.share.title") || draftOf("seo.site.title") || "Berna&co";
    const desc = draftOf("seo.share.description") || draftOf("seo.site.description");
    const img = seoImageDraft;
    const icon = siteIconDraft;
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted">
          Una idea de cómo se vería. La vista real puede variar según Google y
          cada red.
        </p>
        <div className="rounded-xl border border-line bg-cream/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">
            Vista en Google
          </p>
          <div className="mt-2 flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[9px] text-muted">Icono</span>
              )}
            </div>
            <div>
              <p className="text-xs text-green-800">csberna.com.ar</p>
              <p className="text-base leading-snug text-blue-800">
                {draftOf("seo.site.title") || "Título del sitio"}
              </p>
              <p className="text-sm leading-6 text-ink/70">
                {draftOf("seo.site.description") || "Descripción para Google."}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-cream/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">
            Vista al compartir
          </p>
          <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt=""
                className="aspect-[1200/630] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[1200/630] w-full items-center justify-center bg-cream text-xs text-muted">
                Sin imagen
              </div>
            )}
            <div className="border-t border-line p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">
                csberna.com.ar
              </p>
              <p className="mt-1 font-bold leading-snug text-ink">{title}</p>
              {desc && (
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/70">
                  {desc}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logo y marca: vista previa del logo actual + link a Marca y estilos (no se
  // duplica el IdentityEditor completo).
  if (sectionId === "global.logo") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted">
          El logo del sitio. Los colores y tipografías se editan en Marca y
          estilos.
        </p>
        <div className="flex items-center justify-center rounded-lg border border-line bg-cream/40 p-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo actual" className="max-h-20 w-auto" />
          ) : (
            <span className="text-xs text-muted">Sin logo cargado</span>
          )}
        </div>
        <Link
          href="/admin/editor/identidad"
          className="inline-block rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
        >
          Editar logo y marca →
        </Link>
      </div>
    );
  }

  // Descripción larga del producto: el TEXTO se edita en Admin → Productos; la
  // FUENTE/estilo ya tiene control global en Marca y estilos (--description-font,
  // que aplica directo en la descripción del detalle). Acá explicamos y linkeamos.
  if (sectionId === "product.description") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted">
          La descripción larga que se ve al entrar a un producto.
        </p>
        <div className="rounded-lg border border-line bg-cream/40 p-3 text-xs leading-5 text-muted">
          <p>
            <span className="font-bold text-ink">Texto:</span> se edita en cada
            producto, en Admin → Productos (campo “Descripción larga”).
          </p>
          <Link
            href="/admin/productos"
            className="mt-2 inline-block rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            Ir a Productos →
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-cream/40 p-3 text-xs leading-5 text-muted">
          <p>
            <span className="font-bold text-ink">Fuente / estilo:</span> se
            controla en Marca y estilos → “Descripciones de producto”. El cambio
            aplica a esta descripción larga.
          </p>
          <Link
            href="/admin/editor/identidad"
            className="mt-2 inline-block rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            Ir a Marca y estilos →
          </Link>
        </div>
      </div>
    );
  }

  if (!editor) {
    return (
      <InfoPanel
        text="Esta sección se conecta en una próxima fase. Mientras tanto, editala en Modo avanzado."
        href="/admin/editor/home"
        hrefLabel="Abrir Modo avanzado"
      />
    );
  }

  if (editor.kind === "info") {
    return (
      <InfoPanel
        text={editor.text}
        href={editor.href}
        hrefLabel={editor.hrefLabel}
      />
    );
  }

  if (editor.kind === "text") {
    const rows = editor.keys
      .map((k) => textByKey.get(k))
      .filter((t): t is VisualTextRow => Boolean(t));
    const footerSection = sectionId === "global.footer"
      ? sections.find((s) => s.key === "home.footer")
      : null;
    // Diseño de catálogo (fase 3): tarjetas / filtros viven en el config de
    // home.products. Mostramos el panel de diseño en estas dos secciones.
    const catalogDesignWhich: "cards" | "filters" | null =
      sectionId === "catalog.cards"
        ? "cards"
        : sectionId === "catalog.filters"
        ? "filters"
        : null;
    const productsSection = catalogDesignWhich
      ? sections.find((s) => s.key === "home.products")
      : null;
    if (rows.length === 0 && !catalogDesignWhich) {
      return (
        <InfoPanel
          text={
            editor.note ??
            "No encontramos textos editables para esta sección en el editor del sitio. Revisala en Modo avanzado."
          }
          href={editor.href ?? "/admin/editor/footer"}
          hrefLabel={editor.hrefLabel ?? "Abrir Modo avanzado"}
        />
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted">{editor.intro}</p>
        <p className="rounded-lg border border-line bg-cream/40 px-3 py-2 text-xs leading-5 text-muted">
          {SAVE_HELPER}
        </p>
        {rows.map((t) => (
          <CmsTextField
            key={t.key}
            textKey={t.key}
            label={editor.labels[t.key] ?? t.key}
            published={t.value}
            draft={t.valueDraft}
            style={t.style}
            styleDraft={t.styleDraft}
            maxLength={t.maxLength}
            multiline={t.maxLength > 80}
            allowStyle={false}
          />
        ))}
        {editor.note && (
          <div className="rounded-lg border border-line bg-cream/40 p-3 text-xs leading-5 text-muted">
            <p>{editor.note}</p>
            {editor.href && editor.hrefLabel && (
              <Link
                href={editor.href}
                className="mt-2 inline-block rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
              >
                {editor.hrefLabel} →
              </Link>
            )}
          </div>
        )}
        {footerSection && (
          <div className="border-t border-line pt-3">
            <HomeBlockPanel
              sectionKey="home.footer"
              configDraft={footerSection.configDraft}
              selectedTextKey={selectedTextKey}
              selectedElement={selectedElement}
              designTarget={designTarget}
            />
          </div>
        )}
        {catalogDesignWhich && productsSection && (
          <details
            // Se auto-expande al clickear la tarjeta/chip en la vista previa.
            open={
              (catalogDesignWhich === "cards" &&
                selectedElement === "product-card") ||
              (catalogDesignWhich === "filters" &&
                selectedElement === "filter-chip")
            }
            className="rounded-lg border border-line bg-white p-3"
          >
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
              {catalogDesignWhich === "cards"
                ? "Diseño de tarjetas"
                : "Diseño de filtros"}
              {(() => {
                const cfg = parseBlockConfig(productsSection.configDraft);
                const has =
                  catalogDesignWhich === "cards" ? !!cfg.cards : !!cfg.filters;
                return (
                  <span className="ml-2 font-normal normal-case tracking-normal text-muted/80">
                    · {has ? "personalizado" : "por defecto"}
                  </span>
                );
              })()}
            </summary>
            <div className="mt-3">
              <CatalogDesignPanel
                which={catalogDesignWhich}
                productsConfigDraft={productsSection.configDraft}
                designTarget={designTarget}
              />
            </div>
          </details>
        )}
      </div>
    );
  }

  // kind === "block" → panel limpio con "Guardar sección" (una sola llamada).
  const section = sections.find((s) => s.key === editor.blockKey);
  if (!section) {
    return (
      <InfoPanel
        text="No encontramos esta sección en el inicio. Editala en Modo avanzado."
        href="/admin/editor/home"
        hrefLabel="Abrir Modo avanzado"
      />
    );
  }

  const extraRows = (editor.extraTextKeys ?? [])
    .map((k) => textByKey.get(k))
    .filter((t): t is VisualTextRow => Boolean(t));
  const resolvedConfigDraft = resolveVisualBlockConfigDraft(
    section.key,
    section.configDraft,
    textByKey
  );
  const textBindings = visualBlockTextBindings(section.key, textByKey);

  return (
    <div className="space-y-4">
      <HomeBlockPanel
        sectionKey={section.key}
        configDraft={resolvedConfigDraft}
        textBindings={textBindings}
        selectedButton={selectedButton}
        selectedTextKey={selectedTextKey}
        selectedElement={selectedElement}
        designTarget={designTarget}
      />

      {/* Textos de tarjetas (catálogo): pocos labels, colapsados y agrupados.
          Cada uno guarda su propio borrador (mismo sistema del CMS clásico). */}
      {extraRows.length > 0 && (
        <details className="rounded-lg border border-line bg-white p-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-muted">
            Textos de las tarjetas
          </summary>
          <p className="mt-2 mb-3 text-xs leading-5 text-muted">{SAVE_HELPER}</p>
          <div className="space-y-3">
            {extraRows.map((t) => (
              <CmsTextField
                key={t.key}
                textKey={t.key}
                label={PRODUCT_LABELS[t.key] ?? t.key}
                published={t.value}
                draft={t.valueDraft}
                style={t.style}
                styleDraft={t.styleDraft}
                maxLength={t.maxLength}
                multiline={t.maxLength > 80}
                allowStyle={false}
              />
            ))}
          </div>
        </details>
      )}

      {sectionId === "home.products" && (
        <p className="rounded-lg border border-line bg-cream/40 px-3 py-2 text-xs leading-5 text-muted">
          Los nombres, precios, stock e imágenes reales de los productos se
          editan en{" "}
          <Link href="/admin/productos" className="font-bold text-ink underline">
            Admin → Productos
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function InfoPanel({
  text,
  href,
  hrefLabel,
}: {
  text: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-cream/40 p-4 text-sm leading-6 text-muted">
      <p>{text}</p>
      {href && hrefLabel && (
        <Link
          href={href}
          className="mt-3 inline-block rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
        >
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}
