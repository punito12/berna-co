"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
    >
      Imprimir
    </button>
  );
}
