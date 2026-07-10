import Link from "next/link";

// 404 público en español, con el lenguaje visual de la marca.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="rounded-full bg-ink px-5 py-2 font-bold uppercase tracking-[0.25em] text-xs text-white">
        404
      </p>
      <h1 className="mt-6 max-w-md font-black uppercase tracking-tight text-4xl leading-[0.95] text-ink sm:text-5xl">
        Esta página no existe
      </h1>
      <p className="mt-4 max-w-sm font-serif italic text-lg text-muted">
        Puede que el link esté vencido o mal escrito. Las milanesas, por
        suerte, siguen donde siempre.
      </p>
      <Link
        href="/#productos"
        className="mt-8 inline-flex min-h-11 items-center rounded-full bg-ink px-7 py-3 font-bold uppercase tracking-widest text-xs text-white transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        Ver productos
      </Link>
    </main>
  );
}
