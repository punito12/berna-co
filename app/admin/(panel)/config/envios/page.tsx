import { getDeliveryConfig } from "@/lib/delivery-config";
import DeliveryConfigForm from "@/components/DeliveryConfigForm";

export default async function EnviosConfigPage() {
  const config = await getDeliveryConfig();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-black uppercase tracking-tight text-3xl text-ink">
        Envíos y localidades
      </h1>
      <p className="mb-6 text-sm leading-6 text-muted">
        Elegí cómo se validan los envíos a domicilio y administrá las localidades
        a las que llegás. La dirección de retiro se muestra en el checkout cuando
        el cliente elige “Pasar a retirar”.
      </p>
      <DeliveryConfigForm initial={config} />
    </div>
  );
}
