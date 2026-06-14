import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import RemitoSheet from "@/components/RemitoSheet";
import {
  getRemito,
  padRemitoNumber,
  remitoQrDataUrl,
} from "@/lib/remitos";

// Remito imprimible. El maquetado vive en <RemitoSheet> (compartido con la vista
// pública del QR). Los controles (volver/editar/imprimir) quedan fuera del área
// imprimible con `print:hidden`.
export default async function ImprimirRemitoPage({
  params,
}: {
  params: { id: string };
}) {
  const remito = await getRemito(params.id);
  if (!remito) notFound();
  const qrDataUrl = await remitoQrDataUrl(remito.id);

  return (
    <div className="mx-auto max-w-[210mm]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/remitos"
          className="text-xs font-bold uppercase tracking-widest text-muted hover:text-ink"
        >
          ‹ Volver a remitos
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/remitos/${remito.id}/editar`}
            className="border border-line px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            Editar
          </Link>
          <PrintButton
            documentTitle={`Remito ${padRemitoNumber(remito.number)} - Berna&co`}
          />
        </div>
      </div>

      <p className="mb-4 text-[11px] text-muted print:hidden">
        Al tocar <strong>Imprimir / Descargar PDF</strong> se abre el diálogo del
        navegador: elegí <strong>“Guardar como PDF”</strong> como destino para
        descargar el archivo. Sale solo el remito, en una hoja A4.
      </p>

      <RemitoSheet remito={remito} qrDataUrl={qrDataUrl} />
    </div>
  );
}
