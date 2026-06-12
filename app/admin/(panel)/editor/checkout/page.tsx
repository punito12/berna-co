import { listTextsByCategory } from "@/lib/cms-admin";
import { ensureCheckoutCmsTexts } from "@/lib/cms-checkout-texts";
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

export default async function EditorCheckoutPage() {
  // Idempotently create any checkout text that isn't an editable row yet, so
  // the owner can edit ALL checkout copy. Never overwrites existing values.
  await ensureCheckoutCmsTexts();

  const texts = await listTextsByCategory("checkout");
  return (
    <div>
      <h2 className="mb-2 font-black uppercase tracking-tight text-xl text-ink">
        Textos del checkout
      </h2>
      <p className="mb-4 text-sm text-muted">
        En el mensaje de WhatsApp podés usar{" "}
        <code className="rounded bg-cream px-1">{"{pedidoId}"}</code>,{" "}
        <code className="rounded bg-cream px-1">{"{total}"}</code> y{" "}
        <code className="rounded bg-cream px-1">{"{cliente}"}</code>, que se
        reemplazan por los datos del pedido.
      </p>
      <div className="space-y-3">
        {texts.map((t) => (
          <CmsTextField
            key={t.key}
            textKey={t.key}
            label={LABELS[t.key] ?? t.key}
            published={t.value}
            draft={t.valueDraft}
            style={t.style}
            styleDraft={t.styleDraft}
            maxLength={t.maxLength}
            multiline={t.maxLength > 80}
          />
        ))}
      </div>
    </div>
  );
}
