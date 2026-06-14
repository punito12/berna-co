"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CMS_VISUAL_PAGES,
  findVisualPage,
  type CmsVisualSection,
} from "@/lib/cms-visual-editor";
import VisualSectionEditor, {
  type VisualSectionData,
  type VisualTextRow,
} from "@/components/VisualSectionEditor";

type Viewport = "desktop" | "mobile";

// Presets de dispositivo. El iframe se renderiza SIEMPRE a `width` px reales (no
// al ancho disponible del editor), así la página dispara el breakpoint correcto
// y se ve como en un navegador de ese tamaño. Si no entra en el área, se escala
// visualmente con transform manteniendo el ancho interno intacto.
const DEVICE_PRESETS: Record<
  Viewport,
  { width: number; height: number; label: string }
> = {
  desktop: { width: 1440, height: 900, label: "Computadora" },
  mobile: { width: 390, height: 844, label: "Celular" },
};

// Editor visual (Phase 0/1): preview de la página pública (iframe con
// ?preview=token = borrador) + selección de secciones desde el panel lateral.
// Reutiliza el sistema de guardar/descartar/publicar existente del CMS.
export default function VisualEditor({
  previewToken,
  productSlug,
  sections,
  texts,
  logoUrl,
}: {
  previewToken: string | null;
  productSlug: string | null;
  sections: VisualSectionData[];
  texts: VisualTextRow[];
  logoUrl?: string;
}) {
  const [pageId, setPageId] = useState("home");
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Tamaño disponible del área de preview (medido), para calcular el escalado.
  const [stage, setStage] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Mide el área de preview y se actualiza al redimensionar la ventana/panel.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () =>
      setStage({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page = findVisualPage(pageId) ?? CMS_VISUAL_PAGES[0];
  const section = useMemo(
    () => page.sections.find((s) => s.id === sectionId) ?? null,
    [page, sectionId]
  );
  // Secciones reales (en orden de la página) vs las que todavía no están
  // conectadas (status "planned") → se muestran aparte como "Pendiente".
  const activeSections = useMemo(
    () => page.sections.filter((s) => s.status !== "planned"),
    [page]
  );
  const plannedSections = useMemo(
    () => page.sections.filter((s) => s.status === "planned"),
    [page]
  );

  // Refs leídos por los listeners inyectados en el iframe (siempre actualizados).
  const validSectionIdsRef = useRef<Set<string>>(new Set());
  const selectedRef = useRef<string | null>(sectionId);
  useEffect(() => {
    validSectionIdsRef.current = new Set(page.sections.map((s) => s.id));
  }, [page]);
  useEffect(() => {
    selectedRef.current = sectionId;
  }, [sectionId]);

  // Click dentro de la preview → selecciona la sección en el panel. Recibe los
  // marcadores del más interno al más externo y elige el PRIMERO válido para la
  // página actual (así, dentro de la grilla de productos, "catalog.cards" gana
  // en la página Catálogo y "home.products" en la página Home). No cambia la
  // página.
  function handlePreviewSelect(keys: string[]) {
    const match = keys.find((k) => validSectionIdsRef.current.has(k));
    if (match) setSectionId(match);
  }

  // Volver al listado de secciones (estado A del panel, estilo Tiendanube).
  function backToSections() {
    setSectionId(null);
  }

  // Marca visualmente la sección seleccionada dentro del iframe (clase editor-only).
  function applySelectedHighlight(doc: Document, id: string | null) {
    try {
      doc
        .querySelectorAll("[data-cms-section].cms-ve-selected")
        .forEach((el) => el.classList.remove("cms-ve-selected"));
      if (id) {
        const el = doc.querySelector(`[data-cms-section="${cssEscape(id)}"]`);
        el?.classList.add("cms-ve-selected");
      }
    } catch {
      /* iframe no listo */
    }
  }

  // Inyecta estilos + listeners SOLO dentro del iframe del editor (mismo origen).
  // El sitio público real no recibe nada de esto: solo lleva los data-attributes
  // inertes. Se corre en cada load (también tras navegar dentro del iframe).
  function wireIframe() {
    const frame = iframeRef.current;
    let doc: Document | null = null;
    try {
      doc = frame?.contentDocument ?? null;
    } catch {
      doc = null;
    }
    if (!doc) return;

    // Estilos de resaltado (solo en este documento del editor).
    if (!doc.getElementById("cms-ve-style")) {
      const style = doc.createElement("style");
      style.id = "cms-ve-style";
      style.textContent = `
        [data-cms-section]{cursor:pointer;}
        [data-cms-section].cms-ve-hover{outline:2px dashed rgba(10,10,10,.55);outline-offset:-2px;}
        [data-cms-section].cms-ve-selected{outline:3px solid #c0392b;outline-offset:-3px;}
      `;
      doc.head?.appendChild(style);
    }

    // Listeners delegados (idempotente: marcamos el doc para no duplicar).
    const flagged = doc.documentElement.getAttribute("data-cms-ve-wired");
    if (flagged !== "1") {
      doc.documentElement.setAttribute("data-cms-ve-wired", "1");

      doc.addEventListener(
        "mouseover",
        (e) => {
          const el = (e.target as Element | null)?.closest?.(
            "[data-cms-section]"
          );
          if (el) el.classList.add("cms-ve-hover");
        },
        true
      );
      doc.addEventListener(
        "mouseout",
        (e) => {
          const el = (e.target as Element | null)?.closest?.(
            "[data-cms-section]"
          );
          if (el) el.classList.remove("cms-ve-hover");
        },
        true
      );
      doc.addEventListener(
        "click",
        (e) => {
          // Junta los marcadores desde el más interno hacia el más externo,
          // para resolver secciones anidadas (p. ej. catalog.cards dentro de
          // home.products) según la página actual.
          const keys: string[] = [];
          let node: Element | null = (e.target as Element | null)?.closest?.(
            "[data-cms-section]"
          ) ?? null;
          while (node) {
            const k = node.getAttribute("data-cms-section");
            if (k) keys.push(k);
            node = node.parentElement?.closest("[data-cms-section]") ?? null;
          }
          if (keys.length === 0) return;
          // En el editor, clic = seleccionar (no navegar).
          e.preventDefault();
          e.stopPropagation();
          handlePreviewSelect(keys);
        },
        true
      );
    }

    applySelectedHighlight(doc, selectedRef.current);
  }

  // Cuando cambia la selección (desde el panel o la preview), actualizo el
  // resaltado dentro del iframe.
  useEffect(() => {
    const frame = iframeRef.current;
    let doc: Document | null = null;
    try {
      doc = frame?.contentDocument ?? null;
    } catch {
      doc = null;
    }
    if (doc) applySelectedHighlight(doc, sectionId);
  }, [sectionId]);

  // URL pública a previsualizar. "producto" usa el slug real del primer producto.
  const previewPath = useMemo(() => {
    if (page.needsProductSlug) {
      return productSlug ? `/producto/${productSlug}` : undefined;
    }
    return page.previewPath;
  }, [page, productSlug]);

  // Preset del dispositivo + escala para encajar en el área disponible. El ancho
  // interno del iframe queda fijo (1440 / 390); solo se escala visualmente.
  const preset = DEVICE_PRESETS[viewport];
  const PAD = 32; // margen del stage para que no quede pegado a los bordes
  const scale = useMemo(() => {
    if (!stage.w) return 1;
    const fit = (stage.w - PAD) / preset.width;
    return Math.min(1, fit > 0 ? fit : 1);
  }, [stage.w, preset.width]);

  const previewUrl = useMemo(() => {
    if (!previewPath) return null;
    if (!previewToken) return previewPath; // sin token: muestra lo publicado
    const sep = previewPath.includes("?") ? "&" : "?";
    // Conserva un #ancla si la ruta ya la trae (ej. "/#productos").
    const [path, hash] = previewPath.split("#");
    const base = `${path}${sep}preview=${encodeURIComponent(previewToken)}`;
    return hash ? `${base}#${hash}` : base;
  }, [previewPath, previewToken]);

  // Conteo de cambios pendientes (reutiliza el endpoint del CMS actual).
  async function refreshPending() {
    try {
      const res = await fetch("/api/admin/cms/pending", { cache: "no-store" });
      const data = await res.json();
      setPendingCount(data?.pending?.total ?? 0);
    } catch {
      setPendingCount(null);
    }
  }

  useEffect(() => {
    refreshPending();
  }, []);

  // Al cambiar de página, reseteo la sección seleccionada.
  useEffect(() => {
    setSectionId(null);
  }, [pageId]);

  // Selección desde el panel: además de marcar la sección, si tiene ancla
  // pública desplazo la vista previa hasta ahí (mismo origen → sin recargar).
  function selectSection(s: CmsVisualSection) {
    setSectionId(s.id);
    if (!s.anchor) return;
    try {
      const win = iframeRef.current?.contentWindow;
      if (win) win.location.hash = s.anchor;
    } catch {
      // si el iframe todavía no cargó, se ignora (no es crítico en Phase 1)
    }
  }

  async function discard() {
    if (!pendingCount) return;
    const ok = window.confirm(
      "Vas a descartar los borradores y volver al contenido publicado actual."
    );
    if (!ok) return;
    setBusy("discard");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/discard", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudieron descartar los cambios.");
        return;
      }
      setMessage("Borradores descartados.");
      await refreshPending();
      reloadPreview();
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!pendingCount) return;
    const ok = window.confirm(
      "Vas a publicar los cambios. El público los va a ver de inmediato."
    );
    if (!ok) return;
    setBusy("publish");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cms/publish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudo publicar.");
        return;
      }
      setMessage(data.version ? "Cambios publicados." : "No había cambios.");
      await refreshPending();
      reloadPreview();
    } finally {
      setBusy(null);
    }
  }

  const reloadPreview = useCallback(() => {
    const frame = iframeRef.current;
    if (frame && previewUrl) frame.src = previewUrl;
  }, [previewUrl]);

  // Cuando un campo/bloque guarda su borrador (los componentes del CMS disparan
  // "cms:draft-changed"), actualizamos el contador de pendientes y recargamos la
  // vista previa para que se vea el borrador sin salir del editor visual.
  useEffect(() => {
    const onDraftChanged = () => {
      refreshPending();
      reloadPreview();
    };
    window.addEventListener("cms:draft-changed", onDraftChanged);
    return () => window.removeEventListener("cms:draft-changed", onDraftChanged);
  }, [reloadPreview]);

  return (
    <div className="flex h-[100dvh] flex-col bg-cream">
      {/* ---- Top bar ---- */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded border border-line bg-white px-2 py-2 text-[11px] font-black uppercase tracking-widest text-muted hover:border-black hover:text-ink"
            title="Salir del editor"
          >
            ‹ Salir
          </Link>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">
            Editor visual
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-800">
            Beta
          </span>
        </div>

        {/* Selector de página */}
        <label className="flex items-center gap-2">
          <span className="sr-only">Página</span>
          <select
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            className="rounded border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-black"
          >
            {CMS_VISUAL_PAGES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.status === "planned" ? " · próximamente" : ""}
              </option>
            ))}
          </select>
        </label>

        {/* Toggle Computadora / Celular */}
        <div className="flex items-center rounded-full border border-line bg-cream/60 p-1">
          <ViewportButton
            active={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            Computadora
          </ViewportButton>
          <ViewportButton
            active={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            Celulares
          </ViewportButton>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {pendingCount !== null && (
            <span
              className={`text-xs font-bold ${
                pendingCount > 0 ? "text-amber-700" : "text-muted"
              }`}
            >
              {pendingCount > 0
                ? `${pendingCount} sin publicar`
                : "Sin cambios"}
            </span>
          )}
          {/* Cada campo/bloque guarda su propio borrador con su botón "Guardar
              cambios" (mismo sistema del CMS clásico). Este botón solo refresca
              la vista previa para ver los borradores ya guardados. */}
          <button
            type="button"
            onClick={reloadPreview}
            disabled={!previewUrl}
            title="La vista previa se actualiza sola al guardar. Usá esto para forzar un refresco."
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black disabled:opacity-40"
          >
            Refrescar vista previa
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={busy !== null || !pendingCount}
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-muted hover:border-black hover:text-ink disabled:opacity-40"
          >
            {busy === "discard" ? "Descartando…" : "Descartar"}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy !== null || !pendingCount}
            className="rounded bg-ink px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
          >
            {busy === "publish" ? "Publicando…" : "Publicar"}
          </button>
          <Link
            href="/admin/editor/home"
            className="rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
          >
            Modo avanzado
          </Link>
        </div>
        {message && (
          <p className="w-full text-xs font-bold text-green-700">{message}</p>
        )}
      </header>

      {/* ---- Cuerpo: panel lateral + preview ---- */}
      <div className="flex min-h-0 flex-1">
        {/* Panel lateral (estilo Tiendanube): estado A = lista de secciones,
            estado B = ajustes de la sección elegida. La preview a la derecha
            siempre queda visible. */}
        <aside className="flex w-[330px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white">
          {section ? (
            /* ---- Estado B: ajustes de la sección ---- */
            <div className="flex flex-col">
              <button
                type="button"
                onClick={backToSections}
                className="flex items-center gap-1 border-b border-line px-4 py-3 text-[11px] font-black uppercase tracking-widest text-muted hover:text-ink"
              >
                ‹ Secciones
              </button>
              <div className="border-b border-line p-4">
                <h2 className="font-black uppercase tracking-tight text-xl text-ink">
                  {section.label}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {section.description}
                </p>
              </div>
              <div className="p-4">
                {pageId === "home" ||
                pageId === "global" ||
                pageId === "catalogo" ? (
                  <VisualSectionEditor
                    sectionId={section.id}
                    sections={sections}
                    texts={texts}
                    logoUrl={logoUrl}
                  />
                ) : (
                  <>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                      Los controles de esta página se conectan en una próxima
                      fase.
                    </p>
                    {section.advancedHref && (
                      <Link
                        href={section.advancedHref}
                        className="mt-3 inline-block rounded border border-line bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-ink hover:border-black"
                      >
                        Editar en Modo avanzado →
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* ---- Estado A: lista de secciones ---- */
            <div className="flex flex-col">
              <div className="border-b border-line p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">
                  Página
                </p>
                <h2 className="mt-1 font-black uppercase tracking-tight text-xl text-ink">
                  {page.label}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {page.description}
                </p>
              </div>

              <div className="p-4">
                {page.sections.length === 0 ? (
                  <p className="rounded-lg border border-line bg-cream/40 p-3 text-sm leading-6 text-muted">
                    Esta página se mapea en una próxima fase. Por ahora podés ver
                    su vista previa a la derecha y editarla en{" "}
                    <Link
                      href="/admin/editor/home"
                      className="font-bold text-ink underline"
                    >
                      Modo avanzado
                    </Link>
                    .
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-muted">
                      Secciones
                    </p>
                    <ul className="space-y-1.5">
                      {activeSections.map((s) => (
                        <SectionRow
                          key={s.id}
                          label={s.label}
                          description={s.description}
                          onClick={() => selectSection(s)}
                        />
                      ))}
                    </ul>

                    {plannedSections.length > 0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-muted">
                          Pendiente de conectar
                        </p>
                        <ul className="space-y-1.5">
                          {plannedSections.map((s) => (
                            <SectionRow
                              key={s.id}
                              label={s.label}
                              description={s.description}
                              muted
                              onClick={() => selectSection(s)}
                            />
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled
                      title="Próximamente vas a poder sumar secciones nuevas desde acá."
                      className="mt-5 w-full cursor-not-allowed rounded-lg border border-dashed border-line px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-muted opacity-60"
                    >
                      + Agregar sección · próximamente
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Área de vista previa */}
        <main
          ref={stageRef}
          className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-[#e9e4dd] p-4"
        >
          {previewUrl ? (
            (() => {
              const availH = Math.max(stage.h - PAD - 28, 480);
              const isMobile = viewport === "mobile";

              if (isMobile) {
                // Celular: ancho interno EXACTO del preset (390px), sin transform.
                // El marco del teléfono (border 8px) va POR FUERA del iframe
                // (caja inline-block que envuelve al iframe), así no recorta ni
                // descuadra. Centrado con justify-center. Si el editor fuera más
                // angosto que el teléfono, el stage permite scroll horizontal.
                return (
                  <div className="flex min-h-full items-start justify-center">
                    <div className="inline-block flex-none">
                      <div className="overflow-hidden rounded-[2.2rem] border-[8px] border-ink bg-white shadow-xl">
                        <iframe
                          ref={iframeRef}
                          key={previewUrl}
                          src={previewUrl}
                          title={`Vista previa · ${page.label}`}
                          onLoad={wireIframe}
                          className="block border-0 bg-white"
                          style={{ width: preset.width, height: availH }}
                        />
                      </div>
                      <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-muted">
                        {preset.label} · {preset.width}px · mostrando el borrador
                      </p>
                    </div>
                  </div>
                );
              }

              // Computadora: ancho interno fijo (1440) escalado para entrar. La
              // caja exterior reserva el tamaño YA escalado (overflow-hidden) y el
              // iframe se reduce con transform desde la esquina superior izquierda.
              const boxW = preset.width * scale;
              const frameH = availH / scale;
              const boxH = frameH * scale;
              return (
                <div className="flex min-h-full flex-col items-center">
                  <div
                    className="overflow-hidden rounded-xl border border-line bg-white shadow-xl"
                    style={{ width: boxW, height: boxH }}
                  >
                    <iframe
                      ref={iframeRef}
                      key={previewUrl}
                      src={previewUrl}
                      title={`Vista previa · ${page.label}`}
                      onLoad={wireIframe}
                      className="border-0 bg-white"
                      style={{
                        width: preset.width,
                        height: frameH,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-muted">
                    {preset.label} · {preset.width}px
                    {scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""} ·
                    mostrando el borrador
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 text-center">
              <p className="font-black uppercase tracking-tight text-xl text-ink">
                Vista previa pendiente
              </p>
              <p className="text-sm leading-6 text-muted">
                La vista previa de “{page.label}” se conecta en una próxima fase.
                Mientras tanto, editá esta página en{" "}
                <Link
                  href="/admin/editor/home"
                  className="font-bold text-ink underline"
                >
                  Modo avanzado
                </Link>
                .
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Escapa un valor para usarlo en un selector de atributo CSS de forma segura.
function cssEscape(value: string): string {
  const anyCss = (globalThis as { CSS?: { escape?: (v: string) => string } })
    .CSS;
  if (anyCss?.escape) return anyCss.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

// Fila de sección estilo Tiendanube: nombre + descripción corta + chevron.
function SectionRow({
  label,
  description,
  muted = false,
  onClick,
}: {
  label: string;
  description: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg border border-line px-3 py-3 text-left transition-colors hover:border-black hover:bg-cream/40 ${
          muted ? "opacity-70" : ""
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{label}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {description}
          </span>
        </span>
        <span className="shrink-0 text-muted" aria-hidden>
          ›
        </span>
      </button>
    </li>
  );
}

function ViewportButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
        active ? "bg-ink text-white" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
