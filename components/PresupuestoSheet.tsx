import { formatPresupuestoMoney } from "@/lib/presupuestos";

// Hoja del presupuesto (A4, 100% HTML/CSS) basada en la del remito pero LIMPIA.
// Soporta los dos tipos:
//  - PRICE_LIST: tabla Descripción / P. Lista / P. Mayor. (sin total).
//  - QUOTATION:  tabla Descripción / Cantidad / P. Unitario / Subtotal + total.
// SIEMPRE sin QR, sin forma de pago, sin alias, sin nota de remito, sin "recibí
// conforme", sin firma, sin barra inferior. Es un documento comercial.

type SheetItem = {
  id: string;
  description: string;
  // PRICE_LIST
  listPrice: number;
  wholesalePrice: number;
  // QUOTATION
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type SheetData = {
  type: "PRICE_LIST" | "QUOTATION";
  number: number;
  date: Date | null;
  validUntil: Date | null;
  customerName: string;
  total: number;
  items: SheetItem[];
};

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

export default function PresupuestoSheet({ data }: { data: SheetData }) {
  const isQuotation = data.type === "QUOTATION";
  const title = isQuotation ? "Cotización" : "Presupuesto mayorista";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pres-sheet {
              box-sizing: border-box;
              position: relative;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 18mm 16mm 26mm 16mm;
              background: #fff;
              color: #1a1a1a;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              line-height: 1.4;
            }
            .pres-sheet * { box-sizing: border-box; }

            /* Barra negra del pie, igual que el remito pero SIN alias. Parte del
               layout (HTML/CSS), imprime nítida. No tapa contenido porque la hoja
               reserva padding-bottom. */
            .pres-bottom-bar {
              position: absolute;
              left: 0;
              right: 0;
              bottom: 0;
              height: 14mm;
              background: #000;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              font-weight: 700;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page { size: A4; margin: 0; }
            @media print {
              body * { visibility: hidden !important; }
              #pres-print-root, #pres-print-root * { visibility: visible !important; }
              #pres-print-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                min-height: 100vh !important;
                margin: 0 !important;
                padding: 14mm 12mm 26mm 12mm !important;
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

      <div id="pres-print-root" className="pres-sheet shadow print:shadow-none">
        {/* Encabezado: logo (izq) + fecha/datos (der). El PNG del logo tiene
            margen transparente alrededor del recuadro; con márgenes negativos
            sangramos ese aire para que el borde VISIBLE del logo quede a ras del
            borde izquierdo del resto del documento (título, CLIENTE, tabla). */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12mm",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-dark.png"
            alt="Berna&co — Congelados Caseros"
            style={{
              // El PNG tiene ~4.4% de aire transparente a la izquierda y ~7.2%
              // arriba (medido). Lo cancelamos con márgenes negativos para que el
              // recuadro VISIBLE quede a ras del borde izquierdo del documento.
              width: "56mm",
              height: "auto",
              display: "block",
              marginLeft: "-2.5mm",
              marginTop: "-2.2mm",
            }}
          />
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#444" }}>
              Fecha: {dateLabel(data.date)}
            </div>
            {data.validUntil && (
              <div style={{ marginTop: "2px", color: "#444" }}>
                Válido hasta: {dateLabel(data.validUntil)}
              </div>
            )}
            <div style={{ marginTop: "12px", color: "#333", lineHeight: 1.5 }}>
              <div>Bernardo Petavs</div>
              <div>Tel: 11 3212 5287</div>
              <div>Mail: csberna2020@gmail.com</div>
            </div>
          </div>
        </header>

        {/* Título del documento */}
        <div
          style={{
            marginTop: "10mm",
            fontSize: "20px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>

        {/* Cliente */}
        <div style={{ marginTop: "8mm" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#0a0a0a",
            }}
          >
            CLIENTE
          </div>
          <div style={{ marginTop: "2px", fontSize: "14px", fontWeight: 700 }}>
            {data.customerName}
          </div>
        </div>

        {/* Tabla */}
        <table
          style={{
            width: "100%",
            marginTop: "8mm",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                borderTop: "1.5px solid #0a0a0a",
                borderBottom: "1.5px solid #0a0a0a",
              }}
            >
              {isQuotation ? (
                <>
                  <th style={thStyle("left")}>DESCRIPCIÓN</th>
                  <th style={thStyle("right")}>CANTIDAD</th>
                  <th style={thStyle("right")}>P. UNITARIO</th>
                  <th style={thStyle("right")}>SUBTOTAL</th>
                </>
              ) : (
                <>
                  <th style={thStyle("left")}>DESCRIPCIÓN</th>
                  <th style={thStyle("right")}>P. LISTA</th>
                  <th style={thStyle("right")}>P. MAYOR.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td style={tdStyle("left")}>{item.description}</td>
                {isQuotation ? (
                  <>
                    <td style={tdStyle("right")}>{decimal(item.quantity)}</td>
                    <td style={tdStyle("right")}>
                      {formatPresupuestoMoney(item.unitPrice)}
                    </td>
                    <td style={{ ...tdStyle("right"), fontWeight: 700 }}>
                      {formatPresupuestoMoney(item.subtotal)}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={tdStyle("right")}>
                      {formatPresupuestoMoney(item.listPrice)}
                    </td>
                    <td style={{ ...tdStyle("right"), fontWeight: 700 }}>
                      {formatPresupuestoMoney(item.wholesalePrice)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total (solo cotización) */}
        {isQuotation && (
          <div
            style={{
              marginTop: "8mm",
              marginLeft: "auto",
              width: "70mm",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1.5px solid #0a0a0a",
                paddingTop: "6px",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              <span>TOTAL</span>
              <span>{formatPresupuestoMoney(data.total)}</span>
            </div>
          </div>
        )}

        {/* Barra negra del pie (igual que el remito, SIN alias). */}
        <div className="pres-bottom-bar">
          <span>BERNA&amp;CO — CONGELADOS CASEROS</span>
        </div>
      </div>
    </>
  );
}

function thStyle(align: "left" | "right"): React.CSSProperties {
  return {
    padding: "9px 6px",
    textAlign: align,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#0a0a0a",
    fontSize: "11px",
  };
}

function tdStyle(align: "left" | "right"): React.CSSProperties {
  return {
    padding: "9px 6px",
    textAlign: align,
    verticalAlign: "top",
  };
}
