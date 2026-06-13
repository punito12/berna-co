// Client-side helper for CMS draft saves. Wraps fetch with a hard timeout so a
// hanging request can NEVER leave the editor stuck on "Guardando…" forever.
// Returns a structured result instead of throwing.

export type CmsSaveResult = { ok: true } | { ok: false; error: string };

const SAVE_TIMEOUT_MS = 15000;

// POSTs a JSON body to a CMS admin endpoint. Always resolves (never hangs):
// after SAVE_TIMEOUT_MS the request is aborted and an error is returned.
export async function postCmsDraft(
  url: string,
  body: unknown
): Promise<CmsSaveResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      let msg = "No se pudo guardar. Intentá de nuevo.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        // non-JSON error body — keep the generic message
      }
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        error: "La conexión tardó demasiado. Revisá tu internet e intentá de nuevo.",
      };
    }
    return { ok: false, error: "Hubo un problema de conexión. Intentá de nuevo." };
  } finally {
    clearTimeout(timeout);
  }
}

// Notifies the editor status bar that a draft changed (updates the pending
// count without a full page refresh).
export function notifyCmsDraftChanged() {
  window.dispatchEvent(new Event("cms:draft-changed"));
}
