// Small display formatters shared by the checkout and confirmation pages.

const DATE_FMT = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

// e.g. "lunes 2 de junio"
export function formatLongDate(date: Date): string {
  return DATE_FMT.format(date);
}

// Human label for the delivery type.
export function deliveryTypeLabel(type: string): string {
  return type === "PICKUP" ? "Retiro en local (pick-up)" : "Envío a domicilio";
}

// Human label for the payment method.
export function paymentMethodLabel(method: string): string {
  return method === "MERCADOPAGO" ? "Mercado Pago" : "Efectivo al recibir";
}
