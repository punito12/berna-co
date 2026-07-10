"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Error boundary de las rutas públicas: si algo explota en el server (p. ej.
// la base de datos no responde por unos segundos), el cliente ve esto en vez
// de un 500 pelado. "Reintentar" re-renderiza la ruta.
export default function RouteError({
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="rounded-full bg-ink px-5 py-2 font-bold uppercase tracking-[0.25em] text-xs text-white">
        Ups
      </p>
      <h1 className="mt-6 max-w-md font-black uppercase tracking-tight text-4xl leading-[0.95] text-ink sm:text-5xl">
        Algo salió mal
      </h1>
      <p className="mt-4 max-w-sm font-serif italic text-lg text-muted">
        Fue un problema momentáneo de nuestro lado. Probá de nuevo en unos
        segundos.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-ink px-7 py-3 font-bold uppercase tracking-widest text-xs text-white transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-7 py-3 font-bold uppercase tracking-widest text-xs text-ink transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
