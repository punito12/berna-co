import CmsEditorShell from "@/components/CmsEditorShell";

// Shared owner-facing shell for the site editor: one navigation system plus
// preview/publish status. Individual pages only render their editable content.
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CmsEditorShell>{children}</CmsEditorShell>;
}
