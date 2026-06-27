"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureUtm, track } from "@/lib/track-client";

// Dispara page_view en cada cambio de ruta del sitio público y captura los UTM
// de la sesión. Montado en el layout raíz. No renderiza nada y no bloquea: el
// envío es vía sendBeacon. NO trackea rutas de admin (tráfico interno).
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    captureUtm(); // persiste campaña por sesión (si vino en la URL)
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
