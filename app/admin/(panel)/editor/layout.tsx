import SubTabs from "@/components/SubTabs";
import EditorStatusBar from "@/components/EditorStatusBar";

const EDITOR_TABS = [
  { href: "/admin/editor/identidad", label: "Marca y colores" },
  { href: "/admin/editor/home", label: "Página de inicio" },
  { href: "/admin/editor/catalogo", label: "Productos" },
  { href: "/admin/editor/ingredientes", label: "Ingredientes" },
  { href: "/admin/editor/checkout", label: "Finalizar compra" },
  { href: "/admin/editor/footer", label: "Pie de página" },
];

// Shared layout for the site editor: title, sub-tabs, and the always-visible
// status bar (pending changes; preview/publish land in Fase 4).
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="mb-4 font-black uppercase tracking-tight text-3xl text-ink">
        Editor del sitio
      </h1>
      <SubTabs tabs={EDITOR_TABS} />
      <EditorStatusBar />
      {children}
    </div>
  );
}
