"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Último recurso: error en el propio layout raíz. Renderiza su <html> completo
// (acá no hay estilos globales garantizados → estilos inline) y en español.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px",
          backgroundColor: "#f5f0eb",
          color: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Algo salió mal
        </h1>
        <p style={{ marginTop: 16, maxWidth: 380, fontSize: 17, opacity: 0.7 }}>
          Fue un problema momentáneo de nuestro lado. Probá de nuevo en unos
          segundos.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 28,
            padding: "14px 28px",
            borderRadius: 9999,
            border: "none",
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
