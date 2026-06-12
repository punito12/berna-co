import { listTextsByCategory } from "@/lib/cms-admin";
import { ensureCheckoutCmsTexts } from "@/lib/cms-checkout-texts";
import { humanizeCmsKey } from "@/lib/cms-labels";
import CmsTextField from "@/components/CmsTextField";

// Human-readable Spanish labels for every checkout CMS key, prefixed by group
// so the owner never sees a raw technical key. Groups:
//   Cliente · Entrega · Fecha · Pago · Descuentos · Resumen · Errores · Ayuda
const LABELS: Record<string, string> = {
  // General
  "checkout.title": "Título de la página",
  "checkout.cart_label": "Etiqueta · Carrito",
  "checkout.back": "Botón · Volver",
  "checkout.emptyCart": "Mensaje · Carrito vacío",

  // Cliente (paso 1)
  "checkout.step.contact": "Cliente · Título del paso (alt.)",
  "checkout.step1.title": "Cliente · Título del paso",
  "checkout.step1.name_label": "Cliente · Etiqueta nombre",
  "checkout.step1.name_placeholder": "Cliente · Ejemplo nombre",
  "checkout.step1.phone_label": "Cliente · Etiqueta teléfono",
  "checkout.step1.phone_placeholder": "Cliente · Ejemplo teléfono",
  "checkout.step1.email_label": "Cliente · Etiqueta email",
  "checkout.step1.email_placeholder": "Cliente · Ejemplo email",
  "checkout.step1.notes_label": "Cliente · Etiqueta comentarios",
  "checkout.step1.notes_placeholder": "Cliente · Ejemplo comentarios",

  // Entrega (paso 2)
  "checkout.step.delivery": "Entrega · Título del paso (alt.)",
  "checkout.step2.title": "Entrega · Título del paso",
  "checkout.step2.delivery_option": "Entrega · Opción envío a domicilio",
  "checkout.step2.pickup_option": "Entrega · Opción retiro en local",
  "checkout.step2.street_label": "Entrega · Etiqueta calle",
  "checkout.step2.street_placeholder": "Entrega · Ejemplo calle",
  "checkout.step2.locality_label": "Entrega · Etiqueta localidad",
  "checkout.step2.locality_placeholder": "Entrega · Ejemplo localidad",
  "checkout.step2.postal_label": "Entrega · Etiqueta código postal",
  "checkout.step2.postal_placeholder": "Entrega · Ejemplo código postal",
  "checkout.step2.floor_label": "Entrega · Etiqueta piso/depto",
  "checkout.step2.floor_placeholder": "Entrega · Ejemplo piso/depto",
  "checkout.step2.address_label": "Entrega · Etiqueta dirección",
  "checkout.step2.verify_address": "Entrega · Botón verificar dirección",
  "checkout.step2.checking_zone": "Entrega · Verificando zona…",
  "checkout.step2.covered": "Entrega · Dirección cubierta",
  "checkout.step2.not_located": "Entrega · No se ubicó la dirección",
  "checkout.step2.outside_zone": "Entrega · Fuera de zona",

  // Fecha y horario (paso 3)
  "checkout.step.schedule": "Fecha · Título del paso (alt.)",
  "checkout.step3.title": "Fecha · Título del paso",
  "checkout.step3.date_label": "Fecha · Etiqueta día",
  "checkout.step3.slot_label": "Fecha · Etiqueta horario",
  "checkout.step3.verify_first": "Fecha · Verificar zona primero",
  "checkout.step3.no_days": "Fecha · Sin días configurados",
  "checkout.step3.no_slots": "Fecha · Sin horarios disponibles",

  // Pago (paso 4)
  "checkout.step.payment": "Pago · Título del paso (alt.)",
  "checkout.step4.title": "Pago · Título del paso",
  "checkout.step4.cash_label": "Pago · Efectivo (título)",
  "checkout.step4.cash_subtitle": "Pago · Efectivo (subtítulo)",
  "checkout.step4.transfer_label": "Pago · Transferencia (título)",
  "checkout.step4.transfer_subtitle": "Pago · Transferencia (subtítulo)",
  "checkout.step4.mp_label": "Pago · Mercado Pago (título)",
  "checkout.step4.mp_subtitle": "Pago · Mercado Pago (subtítulo)",
  "checkout.step4.mp_note": "Pago · Nota Mercado Pago",
  "checkout.transfer.title": "Pago · Transferencia · Título",
  "checkout.transfer.instructions": "Pago · Transferencia · Instrucciones",

  // Descuentos
  "checkout.discount.quantity_title": "Descuentos · Título por cantidad",
  "checkout.discount.question": "Descuentos · ¿Tenés un código?",
  "checkout.discount.placeholder": "Descuentos · Ejemplo de código",
  "checkout.discount.apply": "Descuentos · Botón aplicar",
  "checkout.discount.remove": "Descuentos · Botón quitar",
  "checkout.discount.code_label": "Descuentos · Etiqueta código",
  "checkout.discount.quantity_earned": "Descuentos · Texto «Comprando»",
  "checkout.discount.units": "Descuentos · Palabra «unidades»",
  "checkout.discount.unit": "Descuentos · Palabra «unidad»",
  "checkout.discount.access": "Descuentos · Texto «accedés a»",
  "checkout.discount.missing_prefix": "Descuentos · Texto «Te faltan»",
  "checkout.discount.missing_suffix": "Descuentos · Texto «para llegar a»",

  // Resumen
  "checkout.step.summary": "Resumen · Título del paso",
  "checkout.summary.subtotal": "Resumen · Subtotal",
  "checkout.summary.promos": "Resumen · Promos",
  "checkout.summary.quantity_discount": "Resumen · Descuento por cantidad",
  "checkout.summary.shipping": "Resumen · Envío",
  "checkout.summary.free": "Resumen · Gratis",
  "checkout.summary.total": "Resumen · Total",

  // Confirmar / pagar
  "checkout.confirm_button": "Botón · Confirmar pedido",
  "checkout.cta.confirm": "Botón · Confirmar (alt.)",
  "checkout.cta.pay": "Botón · Ir a pagar",
  "checkout.confirmado.title": "Confirmación · Título",
  "checkout.confirmado.subtitle": "Confirmación · Subtítulo",

  // Errores / validación
  "checkout.validation.name": "Error · Falta nombre",
  "checkout.validation.phone": "Error · Falta teléfono",
  "checkout.validation.street": "Error · Falta calle",
  "checkout.validation.locality": "Error · Falta localidad",
  "checkout.validation.verify_address": "Error · Verificar dirección",
  "checkout.validation.zone_error": "Error · No se verificó la zona",
  "checkout.validation.date": "Error · Falta día",
  "checkout.validation.slot": "Error · Falta horario",
  "checkout.validation.connection": "Error · Conexión",
  "checkout.validation.submit_error": "Error · Al guardar el pedido",

  // Ayuda / WhatsApp
  "checkout.help_button": "Ayuda · Botón pedir por WhatsApp",
  "checkout.help.whatsapp_intro": "Ayuda · Intro de WhatsApp",
  "checkout.help.cart_title": "Ayuda · «Tengo en el carrito»",
  "checkout.help.customer_data": "Ayuda · «Mis datos»",
  "checkout.whatsapp.template": "Mensaje de WhatsApp del pedido",
};

const FIELD_GROUPS = [
  {
    id: "general",
    title: "Vista general",
    description: "Título de la pantalla, regreso al carrito y mensajes base.",
    keys: [
      "checkout.title",
      "checkout.cart_label",
      "checkout.back",
      "checkout.emptyCart",
    ],
  },
  {
    id: "customer",
    title: "1. Datos del cliente",
    description: "Nombre, teléfono, email y comentarios del pedido.",
    keys: [
      "checkout.step.contact",
      "checkout.step1.title",
      "checkout.step1.name_label",
      "checkout.step1.name_placeholder",
      "checkout.step1.phone_label",
      "checkout.step1.phone_placeholder",
      "checkout.step1.email_label",
      "checkout.step1.email_placeholder",
      "checkout.step1.notes_label",
      "checkout.step1.notes_placeholder",
    ],
  },
  {
    id: "delivery",
    title: "2. Entrega",
    description: "Dirección, retiro, verificación de zona y estados del mapa.",
    keys: [
      "checkout.step.delivery",
      "checkout.step2.title",
      "checkout.step2.delivery_option",
      "checkout.step2.pickup_option",
      "checkout.step2.street_label",
      "checkout.step2.street_placeholder",
      "checkout.step2.locality_label",
      "checkout.step2.locality_placeholder",
      "checkout.step2.postal_label",
      "checkout.step2.postal_placeholder",
      "checkout.step2.floor_label",
      "checkout.step2.floor_placeholder",
      "checkout.step2.address_label",
      "checkout.step2.verify_address",
      "checkout.step2.checking_zone",
      "checkout.step2.covered",
      "checkout.step2.not_located",
      "checkout.step2.outside_zone",
    ],
  },
  {
    id: "schedule",
    title: "3. Día y horario",
    description: "Textos de selección de fecha y franja de entrega.",
    keys: [
      "checkout.step.schedule",
      "checkout.step3.title",
      "checkout.step3.date_label",
      "checkout.step3.slot_label",
      "checkout.step3.verify_first",
      "checkout.step3.no_days",
      "checkout.step3.no_slots",
    ],
  },
  {
    id: "payment",
    title: "4. Pago",
    description: "Métodos de pago, transferencia y Mercado Pago.",
    keys: [
      "checkout.step.payment",
      "checkout.step4.title",
      "checkout.step4.cash_label",
      "checkout.step4.cash_subtitle",
      "checkout.step4.transfer_label",
      "checkout.step4.transfer_subtitle",
      "checkout.step4.mp_label",
      "checkout.step4.mp_subtitle",
      "checkout.step4.mp_note",
      "checkout.transfer.title",
      "checkout.transfer.instructions",
    ],
  },
  {
    id: "discounts",
    title: "Descuentos",
    description: "Códigos promocionales y textos del descuento por cantidad.",
    keys: [
      "checkout.discount.quantity_title",
      "checkout.discount.question",
      "checkout.discount.placeholder",
      "checkout.discount.apply",
      "checkout.discount.remove",
      "checkout.discount.code_label",
      "checkout.discount.quantity_earned",
      "checkout.discount.units",
      "checkout.discount.unit",
      "checkout.discount.access",
      "checkout.discount.missing_prefix",
      "checkout.discount.missing_suffix",
    ],
  },
  {
    id: "summary",
    title: "Resumen y confirmación",
    description: "Totales, subtotales, botones finales y pantalla de éxito.",
    keys: [
      "checkout.step.summary",
      "checkout.summary.subtotal",
      "checkout.summary.promos",
      "checkout.summary.quantity_discount",
      "checkout.summary.shipping",
      "checkout.summary.free",
      "checkout.summary.total",
      "checkout.confirm_button",
      "checkout.cta.confirm",
      "checkout.cta.pay",
      "checkout.confirmado.title",
      "checkout.confirmado.subtitle",
    ],
  },
  {
    id: "errors",
    title: "Errores y validaciones",
    description: "Mensajes que aparecen si falta información o falla el envío.",
    keys: [
      "checkout.validation.name",
      "checkout.validation.phone",
      "checkout.validation.street",
      "checkout.validation.locality",
      "checkout.validation.verify_address",
      "checkout.validation.zone_error",
      "checkout.validation.date",
      "checkout.validation.slot",
      "checkout.validation.connection",
      "checkout.validation.submit_error",
    ],
  },
  {
    id: "help",
    title: "Ayuda y WhatsApp",
    description: "Texto del acceso a WhatsApp y plantilla del mensaje.",
    keys: [
      "checkout.help_button",
      "checkout.help.whatsapp_intro",
      "checkout.help.cart_title",
      "checkout.help.customer_data",
      "checkout.whatsapp.template",
    ],
  },
] as const;

type CheckoutText = Awaited<ReturnType<typeof listTextsByCategory>>[number];

function isCheckoutText(text: CheckoutText | undefined): text is CheckoutText {
  return Boolean(text);
}

export default async function EditorCheckoutPage() {
  // Idempotently create any checkout text that isn't an editable row yet, so
  // the owner can edit ALL checkout copy. Never overwrites existing values.
  await ensureCheckoutCmsTexts();

  const texts = await listTextsByCategory("checkout");
  const textByKey = new Map(texts.map((text) => [text.key, text]));
  const groupedKeys = new Set<string>(FIELD_GROUPS.flatMap((group) => group.keys));
  const extraTexts = texts.filter((text) => !groupedKeys.has(text.key));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              Checkout público
            </p>
            <h2 className="font-black uppercase tracking-tight text-2xl text-ink">
              Finalizar compra
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Editá los textos que ve el cliente durante el checkout. Los cambios
            quedan como borrador hasta publicar.
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-line bg-cream/35 p-4 text-sm leading-6 text-muted">
          En el mensaje de WhatsApp podés usar{" "}
          <code className="rounded bg-white px-1 font-bold text-ink">
            {"{pedidoId}"}
          </code>
          ,{" "}
          <code className="rounded bg-white px-1 font-bold text-ink">
            {"{total}"}
          </code>{" "}
          y{" "}
          <code className="rounded bg-white px-1 font-bold text-ink">
            {"{cliente}"}
          </code>
          . El sistema los reemplaza por los datos del pedido.
        </div>
      </section>

      <div className="space-y-5">
        {FIELD_GROUPS.map((group) => {
          const groupTexts = group.keys
            .map((key) => textByKey.get(key))
            .filter(isCheckoutText);
          if (groupTexts.length === 0) return null;
          return (
            <section
              key={group.id}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black uppercase tracking-tight text-lg text-ink">
                    {group.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {group.description}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-line bg-cream px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                  {groupTexts.length} campos
                </span>
              </div>
              <div className="grid gap-3">
                {groupTexts.map((t) => (
                  <CmsTextField
                    key={t.key}
                    textKey={t.key}
                    label={LABELS[t.key] ?? humanizeCmsKey(t.key)}
                    published={t.value}
                    draft={t.valueDraft}
                    style={t.style}
                    styleDraft={t.styleDraft}
                    maxLength={t.maxLength}
                    multiline={t.maxLength > 80}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {extraTexts.length > 0 && (
          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 border-b border-line pb-4">
              <h3 className="font-black uppercase tracking-tight text-lg text-ink">
                Otros textos
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                Campos agregados al CMS que todavía no tienen grupo propio.
              </p>
            </div>
            <div className="grid gap-3">
              {extraTexts.map((t) => (
                <CmsTextField
                  key={t.key}
                  textKey={t.key}
                  label={LABELS[t.key] ?? humanizeCmsKey(t.key)}
                  published={t.value}
                  draft={t.valueDraft}
                  style={t.style}
                  styleDraft={t.styleDraft}
                  maxLength={t.maxLength}
                  multiline={t.maxLength > 80}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
