import { listTextsByCategory } from "@/lib/cms-admin";
import CmsTextField from "@/components/CmsTextField";

const LABELS: Record<string, string> = {
  "checkout.step.contact": "Paso 1 · Título",
  "checkout.step.delivery": "Paso 2 · Título",
  "checkout.step.schedule": "Paso 3 · Título",
  "checkout.step.payment": "Paso 4 · Título",
  "checkout.step.summary": "Paso 5 · Título",
  "checkout.cta.confirm": "Botón · Confirmar pedido",
  "checkout.cta.pay": "Botón · Ir a pagar",
  "checkout.emptyCart": "Mensaje carrito vacío",
  "checkout.confirmado.title": "Confirmación · Título",
  "checkout.confirmado.subtitle": "Confirmación · Subtítulo",
  "checkout.whatsapp.template": "Mensaje de WhatsApp",
};

export default async function EditorCheckoutPage() {
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
            maxLength={t.maxLength}
            multiline={t.maxLength > 80}
          />
        ))}
      </div>
    </div>
  );
}
