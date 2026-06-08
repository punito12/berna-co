import { getPaymentConfig } from "@/lib/payment-config";
import PaymentConfigForm from "@/components/PaymentConfigForm";

// Configuración → Métodos de pago: per-method discounts + transfer data.
export default async function MetodosPagoPage() {
  const config = await getPaymentConfig();

  return (
    <div>
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Métodos de pago
      </h1>
      <p className="mb-6 text-sm text-muted">
        Descuentos por método (efectivo / transferencia) y datos para que el
        cliente transfiera y envíe el comprobante por WhatsApp.
      </p>
      <PaymentConfigForm initial={config} />
    </div>
  );
}
