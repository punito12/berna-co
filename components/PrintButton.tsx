"use client";

import { useEffect } from "react";

// Botón para imprimir / descargar el remito como PDF. Usa el diálogo nativo del
// navegador: ahí se elige "Guardar como PDF" para descargar el archivo. La
// impresión sale aislada (solo el remito) gracias al CSS @media print de la
// página. Si se pasa `documentTitle`, se usa como nombre por defecto del PDF.
export default function PrintButton({
  documentTitle,
}: {
  documentTitle?: string;
}) {
  // El navegador toma el <title> del documento como nombre por defecto del
  // archivo PDF. Lo seteamos al número de remito y lo restauramos al salir.
  useEffect(() => {
    if (!documentTitle) return;
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
      title="Abre el diálogo de impresión. Elegí 'Guardar como PDF' para descargar."
    >
      Imprimir / Descargar PDF
    </button>
  );
}
