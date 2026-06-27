"use client";

// Tracking del lado del cliente para el ecommerce público. Liviano y no
// bloqueante: usa navigator.sendBeacon (fallback a fetch keepalive). Maneja la
// identidad anónima (anonymousId persistente + sessionId por sesión) y captura
// los UTM al entrar, persistiéndolos por la sesión. SIN datos personales.

const ANON_KEY = "berna_anon_id"; // localStorage, persistente
const SESSION_KEY = "berna_session_id"; // sessionStorage, por sesión
const UTM_KEY = "berna_utm"; // sessionStorage, campaña de la sesión

type Utm = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

function uid(): string {
  // id corto sin dependencias. crypto.randomUUID si está disponible.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "session";
  }
}

// Captura UTM de la URL actual y los persiste por la sesión. Si ya hay UTM
// guardados (entró antes por una campaña), no los pisa con vacío.
export function captureUtm(): Utm {
  try {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl: Utm = {};
    const map: [keyof Utm, string][] = [
      ["utmSource", "utm_source"],
      ["utmMedium", "utm_medium"],
      ["utmCampaign", "utm_campaign"],
      ["utmContent", "utm_content"],
      ["utmTerm", "utm_term"],
    ];
    let any = false;
    for (const [k, qp] of map) {
      const v = sp.get(qp);
      if (v) {
        fromUrl[k] = v.slice(0, 120);
        any = true;
      }
    }
    if (any) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const saved = sessionStorage.getItem(UTM_KEY);
    return saved ? (JSON.parse(saved) as Utm) : {};
  } catch {
    return {};
  }
}

function getUtm(): Utm {
  try {
    const saved = sessionStorage.getItem(UTM_KEY);
    return saved ? (JSON.parse(saved) as Utm) : {};
  } catch {
    return {};
  }
}

export type TrackProps = {
  path?: string;
  productId?: string;
  productName?: string;
  variantName?: string;
  quantity?: number;
  value?: number;
  paymentMethod?: string;
  deliveryMethod?: string;
  locality?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

// Envía un evento. No bloqueante: sendBeacon si existe, si no fetch keepalive.
// Cualquier error se traga (el tracking nunca debe romper la UX).
export function track(eventName: string, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      eventName,
      sessionId: getSessionId(),
      anonymousId: getAnonId(),
      path: props.path ?? window.location.pathname,
      referrer: document.referrer || undefined,
      ...getUtm(),
      productId: props.productId,
      productName: props.productName,
      variantName: props.variantName,
      quantity: props.quantity,
      value: props.value,
      paymentMethod: props.paymentMethod,
      deliveryMethod: props.deliveryMethod,
      locality: props.locality,
      orderId: props.orderId,
      metadata: props.metadata,
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/track", blob);
      if (ok) return;
    }
    // Fallback: fetch con keepalive para que sobreviva a la navegación.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // silencioso
  }
}

// Devuelve los UTM actuales de la sesión, para adjuntarlos a la creación de
// pedido (el order_created lo registra el server con estos datos).
export function currentUtm(): Utm {
  return getUtm();
}

export function currentIds(): { sessionId: string; anonymousId: string } {
  return { sessionId: getSessionId(), anonymousId: getAnonId() };
}
