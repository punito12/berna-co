import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
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
          <PrintButton />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4; margin: 0; }
            @media print {
              html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
              .admin-shell, main { padding: 0 !important; margin: 0 !important; }
            }
          `,
        }}
      />

      <div className="relative h-[297mm] w-[210mm] overflow-hidden bg-white text-[#333] shadow print:shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/templates/remito-original.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full select-none"
        />

        <Field x={414} y={96} w={108} bold>
          {formatRemitoNumber(remito.number)}
        </Field>
        <Field x={414} y={119} w={100}>
          {dateLabel(remito.date)}
        </Field>
        <Field x={78} y={251} w={430} bold>
          {remito.customerName}
        </Field>

        {remito.items.slice(0, 9).map((item, index) => {
          const y = 326 + index * 18;
          return (
            <div key={item.id}>
              <Field x={104} y={y} w={72}>
                {decimal(item.quantity)} {item.unit}
              </Field>
              <Field x={207} y={y} w={145}>
                {item.description}
              </Field>
              <Field x={361} y={y} w={75} align="right">
                {formatRemitoMoney(item.unitPrice)}
              </Field>
              <Field x={464} y={y} w={55} align="right">
                {formatRemitoMoney(item.total)}
              </Field>
            </div>
          );
        })}

        <Field x={443} y={525} w={76} align="right">
          {formatRemitoMoney(remito.subtotal)}
        </Field>
        <Field x={407} y={552} w={32} align="center">
          {decimal(remito.discountPercent)}
        </Field>
        <Field x={443} y={552} w={76} align="right">
          {formatRemitoMoney(remito.discountAmount)}
        </Field>
        <Field x={443} y={599} w={76} align="right" bold size={12}>
          {formatRemitoMoney(remito.total)}
        </Field>

        <Field x={79} y={675} w={200} bold>
          {remito.paymentMethod}
        </Field>
        <Field x={79} y={724} w={200}>
          {remito.note}
        </Field>

        <Field x={331} y={715} w={170}>
          {remito.receivedSignature}
        </Field>
        <Field x={331} y={743} w={170}>
          {remito.receivedClarification}
        </Field>
        <Field x={331} y={770} w={170}>
          {dateLabel(remito.receivedDate)}
        </Field>
      </div>
    </div>
  );
}

function Field({
  x,
  y,
  w,
  children,
  align = "left",
  bold = false,
  size = 10,
}: {
  x: number;
  y: number;
  w: number;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  bold?: boolean;
  size?: number;
}) {
  return (
    <div
      className="absolute overflow-hidden whitespace-nowrap bg-white/95 px-1"
      style={{
        left: `${(x / 596) * 100}%`,
        top: `${(y / 842) * 100}%`,
        width: `${(w / 596) * 100}%`,
        fontSize: `${size}px`,
        lineHeight: "1.25",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontWeight: bold ? 700 : 500,
        textAlign: align,
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </div>
  );
}
