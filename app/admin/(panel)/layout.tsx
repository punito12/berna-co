import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

// Todo el panel depende de cookie de sesión y datos vivos. Esta declaración se
// hereda por sus páginas y evita consultas masivas a Neon durante el build.
export const dynamic = "force-dynamic";

// Guards every page in the (panel) group. /admin/login is OUTSIDE this group,
// so it stays reachable without a session.
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthenticated()) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav />
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
