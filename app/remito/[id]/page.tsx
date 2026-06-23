import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PrintButton from "@/components/PrintButton";
import RemitoSheet from "@/components/RemitoSheet";
import { getRemito, padRemitoNumber, remitoQrDataUrl } from "@/lib/remitos";

// Cada remito se consulta por id en runtime; nunca debe prerenderizarse con DB.
export const dynamic = "force-dynamic";

// No indexar esta página: es una constancia individual, no contenido del sitio.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Vista pública de SOLO LECTURA de un remito, abierta al escanear el QR. El `id`
// es un cuid (no-secuencial, inadivinable), así que NO hay forma de enumerar
// remitos por id incremental. No expone controles de admin ni otros remitos:
// solo muestra ESTE remito y un botón para imprimir/descargar PDF. Sin login.
export default async function RemitoPublicoPage({
  params,
}: {
  params: { id: string };
}) {
  const remito = await getRemito(params.id);
  if (!remito || remito.archived) notFound();
  const qrDataUrl = await remitoQrDataUrl(remito.id);

  return (
    <main className="min-h-screen bg-neutral-100 py-6">
      <div className="mx-auto max-w-[210mm] px-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Remito {padRemitoNumber(remito.number)} · Berna&amp;co
          </div>
          <PrintButton
            documentTitle={`Remito ${padRemitoNumber(remito.number)} - Berna&co`}
          />
        </div>

        <RemitoSheet remito={remito} qrDataUrl={qrDataUrl} />
      </div>
    </main>
  );
}
