import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import {
  formatRemitoMoney,
  formatRemitoNumber,
  getRemito,
} from "@/lib/remitos";

function dateLabel(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function decimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

// Remito imprimible. Maquetado 100% en HTML/CSS (sin imagen/PDF de fondo) para
// que imprima nítido y entre en una sola hoja A4. El PDF original se usó solo
// como referencia visual. Los controles (volver/editar/imprimir) quedan fuera
// del área imprimible con `print:hidden` y `.remito-sheet` define la hoja.
export default async function ImprimirRemitoPage({
  params,
}: {
  params: { id: string };
}) {
  const remito = await getRemito(params.id);
  if (!remito) notFound();

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
            documentTitle={`Remito ${String(remito.number).padStart(6, "0")} - Berna&co`}
          />
        </div>
      </div>

      <p className="mb-4 text-[11px] text-muted print:hidden">
        Al tocar <strong>Imprimir / Descargar PDF</strong> se abre el diálogo del
        navegador: elegí <strong>“Guardar como PDF”</strong> como destino para
        descargar el archivo. Sale solo el remito, en una hoja A4.
      </p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Vista en pantalla: simula la hoja A4 con su padding interno. */
            .remito-sheet {
              box-sizing: border-box;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 18mm 16mm;
              background: #fff;
              color: #1a1a1a;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              line-height: 1.4;
            }
            .remito-sheet * { box-sizing: border-box; }

            /* @page con margen 0: así el navegador NO dibuja sus encabezados/
               pies (fecha, título, URL, "1/1"). El margen real lo da el padding
               del propio remito en impresión, para que igual no se corte. */
            @page { size: A4; margin: 0; }
            @media print {
              /* Aislar: ocultar todo el panel admin y mostrar solo el remito. */
              body * { visibility: hidden !important; }
              #remito-print-root, #remito-print-root * { visibility: visible !important; }
              #remito-print-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 14mm 12mm !important;
                box-shadow: none !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      <div id="remito-print-root" className="remito-sheet shadow print:shadow-none">
        {/* Encabezado: logo (izq) + remito/fecha/datos (der) */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12mm",
          }}
        >
          {/* Logo real de Berna&co (mismo archivo que usa el sitio). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-dark.png"
            alt="Berna&co — Congelados Caseros"
            style={{ width: "62mm", height: "auto", display: "block" }}
          />

          <div style={{ textAlign: "right", paddingTop: "4px" }}>
            <div style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.06em" }}>
              {formatRemitoNumber(remito.number)}
            </div>
            <div style={{ marginTop: "2px", color: "#444" }}>
              Fecha: {dateLabel(remito.date)}
            </div>
            <div style={{ marginTop: "12px", color: "#333", lineHeight: 1.5 }}>
              <div>Bernardo Petavs</div>
              <div>Tel: 11 3212 5287</div>
              <div>Mail: csberna2020@gmail.com</div>
            </div>
          </div>
        </header>

        {/* Nombre del cliente */}
        <div style={{ marginTop: "10mm" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#0a0a0a",
            }}
          >
            NOMBRE
          </div>
          <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
            {remito.customerName}
          </div>
        </div>

        {/* Tabla de ítems */}
        <table
          style={{
            width: "100%",
            marginTop: "8mm",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr
              style={{
                borderTop: "1.5px solid #0a0a0a",
                borderBottom: "1.5px solid #0a0a0a",
              }}
            >
              <th style={thStyle("left")}>CANTIDAD</th>
              <th style={thStyle("left")}>DESCRIPCION</th>
              <th style={thStyle("right")}>PRECIO U.</th>
              <th style={thStyle("right")}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {remito.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td style={tdStyle("left")}>
                  {decimal(item.quantity)} {item.unit}
                </td>
                <td style={tdStyle("left")}>{item.description}</td>
                <td style={tdStyle("right")}>
                  {formatRemitoMoney(item.unitPrice)}
                </td>
                <td style={tdStyle("right")}>{formatRemitoMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales (alineados a la derecha) */}
        <div
          style={{
            marginTop: "8mm",
            marginLeft: "auto",
            width: "70mm",
            fontSize: "11px",
          }}
        >
          <div style={totalRow}>
            <span style={{ color: "#444" }}>Subtotal</span>
            <span>{formatRemitoMoney(remito.subtotal)}</span>
          </div>
          <div style={totalRow}>
            <span style={{ color: "#444" }}>
              Descuento ({decimal(remito.discountPercent)} %)
            </span>
            <span>{formatRemitoMoney(remito.discountAmount)}</span>
          </div>
          <div
            style={{
              ...totalRow,
              borderTop: "1.5px solid #0a0a0a",
              marginTop: "4px",
              paddingTop: "6px",
              fontWeight: 800,
              fontSize: "14px",
            }}
          >
            <span>TOTAL</span>
            <span>{formatRemitoMoney(remito.total)}</span>
          </div>
        </div>

        {/* Pie: forma de pago / nota / alias  |  recibí conforme */}
        <div
          style={{
            marginTop: "14mm",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10mm",
          }}
        >
          <div style={{ paddingRight: "8mm" }}>
            <div style={footerHeading}>FORMA DE PAGO</div>
            <div style={{ marginTop: "2px", minHeight: "14px" }}>
              {remito.paymentMethod}
            </div>

            <div style={{ ...footerHeading, marginTop: "10mm" }}>NOTA:</div>
            <div style={{ marginTop: "2px", whiteSpace: "pre-wrap", minHeight: "14px" }}>
              {remito.note}
            </div>

            <div style={{ ...footerHeading, marginTop: "10mm" }}>
              ALIAS: BERNA.NUTS
            </div>
          </div>

          <div style={{ borderLeft: "1px solid #cfcfcf", paddingLeft: "10mm" }}>
            <div style={footerHeading}>RECIBÍ CONFORME</div>
            <FooterField label="Firma" value={remito.receivedSignature} />
            <FooterField label="Aclaración" value={remito.receivedClarification} />
            <FooterField label="Fecha" value={dateLabel(remito.receivedDate)} />
          </div>
        </div>
      </div>
    </div>
  );
}

const totalRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 0",
};

const footerHeading: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: "#0a0a0a",
};

function thStyle(align: "left" | "right"): React.CSSProperties {
  return {
    padding: "8px 6px",
    textAlign: align,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#0a0a0a",
    fontSize: "11px",
  };
}

function tdStyle(align: "left" | "right"): React.CSSProperties {
  return {
    padding: "7px 6px",
    textAlign: align,
    verticalAlign: "top",
  };
}

function FooterField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: "10mm" }}>
      <div style={{ minHeight: "16px", fontSize: "12px" }}>{value}</div>
      <div
        style={{
          borderTop: "1px solid #9a9a9a",
          marginTop: "2px",
          paddingTop: "3px",
          fontSize: "10px",
          color: "#666",
        }}
      >
        {label}
      </div>
    </div>
  );
}
