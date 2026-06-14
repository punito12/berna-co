"use client";

import Link from "next/link";
import CmsTextField from "@/components/CmsTextField";
import HomeBlockPanel from "@/components/HomeBlockPanel";

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
};

const SAVE_HELPER =
  "Cada cambio se guarda como borrador desde su campo; después publicás arriba.";

export default function VisualSectionEditor({
  sectionId,
  sections,
  texts,
  logoUrl,
}: {
  sectionId: string;
  sections: VisualSectionData[];
  texts: VisualTextRow[];
  logoUrl?: string;
}) {
  const editor = SECTION_EDITORS[sectionId];
  const textByKey = new Map(texts.map((t) => [t.key, t]));

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
    if (rows.length === 0) {
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

  return (
    <div className="space-y-4">
      <HomeBlockPanel
        sectionKey={section.key}
        configDraft={section.configDraft}
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
