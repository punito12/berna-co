import SubTabs from "@/components/SubTabs";
import EditorStatusBar from "@/components/EditorStatusBar";

const EDITOR_TABS = [
  { href: "/admin/editor/identidad", label: "Identidad" },
  { href: "/admin/editor/home", label: "Home" },
  { href: "/admin/editor/catalogo", label: "Catálogo" },
  { href: "/admin/editor/checkout", label: "Checkout" },
  { href: "/admin/editor/footer", label: "Footer" },
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
