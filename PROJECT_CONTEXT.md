Resumen Ejecutivo — berna-co
Qué hace el producto
Aplicación web única (Next.js) para Berna&co, una marca de milanesas/empanados premium congelados. Combina dos cosas en un mismo proyecto:

Storefront público: catálogo de productos con variantes ("empanados": TRADITIONAL/INTEGRAL/KETO), carrito, y checkout con cálculo de zona de entrega por mapa, descuentos, y tres métodos de pago (efectivo, transferencia, Mercado Pago).
Panel de administración completo (/admin): un ERP en miniatura para el dueño — pedidos/ventas, caja, cuentas corrientes (por cobrar y por pagar), compras a proveedores, stock por empanado, costos y precios, y un CMS para editar el sitio sin tocar código.
Estado actual
Producto funcional y en uso real (el dueño ya carga ventas reales). Rama main, working tree limpio salvo AGENTS.md sin commitear. Último commit: ee2b98e "Pre-Codex migration checkpoint". Base SQLite local con datos reales (no borrar: hay ~18 pedidos, 2 ventas manuales, 8 productos). Se está migrando el desarrollo de Claude Code a OpenAI Codex (de ahí el AGENTS.md recién creado).

Funcionalidades terminadas
Storefront: home con secciones dinámicas, catálogo con filtros y stock por empanado, detalle de producto, carrito (Context + localStorage).
Checkout: validación de dirección + geolocalización + zona de entrega (Leaflet polygons), días/horarios, promos por producto (2x1/3x2/%), descuento por código, descuento por cantidad de unidades, precios diferenciados por método de pago (efectivo/transferencia con % off), pantalla de transferencia (alias/CBU/WhatsApp, mobile-first), e integración Mercado Pago Checkout Pro con webhook.
Pedidos y ventas unificados: vista única que junta pedidos web (Order) y ventas manuales (ManualSale), con detalle, edición, cambio de estado, cancelación transaccional (revierte stock + caja atómicamente) y borrado.
Caja: ingresos/egresos con source y estado AVAILABLE/PENDING; MP respeta accrualDate; resumen mensual + gráfico.
Cuentas corrientes: por cobrar (clientes mayoristas) y por pagar (proveedores), con aging y registro de pagos.
Compras y proveedores: ABM + órdenes de compra + pagos a proveedor (impactan caja).
Stock: movimientos auditables por empanado (PRODUCTION/SALE/ADJUSTMENT/WASTE), producción, inventario.
Costos y precios: planillas tipo Excel (CostSheet con fórmulas exactas), tabla maestra de precios con edición inline, parámetros, competencia, histórico.
CMS — Fases 1-3 hechas: schema de contenido (textos/imágenes/colores/secciones con campos *Draft), frontend refactorizado para leer todo del CMS (con fallbacks), y editor admin completo (identidad visual con contraste WCAG y fuentes, reordenamiento de secciones drag-and-drop, editores de texto con auto-save).
Otros: newsletter, clientes, barrios/facturación, autenticación admin por contraseña única.
Funcionalidades en desarrollo
CMS — Fases 4 y 5 PENDIENTES (esto es lo único a medio terminar):

Fase 4 — Preview y publicación: hoy las ediciones del CMS se guardan en campos *Draft pero no hay forma de publicarlas (copiar draft → value), ni de previsualizar con token, ni de revertir. La tabla SiteVersion existe pero está vacía (0 filas). El editor muestra "X cambios sin publicar" pero el botón de publicar todavía no existe.
Fase 5 — Pulido: tour del editor, confirmación al salir con cambios, export/import de backup JSON, "modo seguro" que bloquea publicar si hay valores rotos.
Importante: como no hay publish todavía, cualquier draft de prueba hay que restaurarlo a mano (el público nunca ve los drafts, así que es seguro, pero quedan pendientes en el contador).

Problemas conocidos
SQLite no escala a producción serverless (filesystem efímero). Para deployar (ej. Vercel) hay que migrar a Postgres y cambiar el provider de Prisma + DATABASE_URL.
Mercado Pago requiere URL pública: en dev se usa un túnel cloudflared y se actualiza NEXT_PUBLIC_BASE_URL manualmente cada vez (las URLs trycloudflare cambian). Frágil para testing.
prisma migrate dev no funciona en este entorno: hay que usar el flujo manual migrate diff + migrate deploy (documentado en AGENTS.md).
Vulnerabilidades de next en npm audit (la versión instalada, 14.2.18, tiene advisories) — no bloqueantes, decisión pendiente de actualizar.
CMS texto/imagen del footer en detalle de producto usa defaults hardcodeados (no lee del bundle) — cosmético, los valores coinciden.
Próximos pasos prioritarios
Completar CMS Fase 4 (publicación/preview/revert) — es la pieza que cierra el círculo del editor; sin esto, editar el sitio no sirve para el usuario final.
CMS Fase 5 (guardrails + backup).
Verificación end-to-end del CMS (el spec original define 6 casos: cambiar color/título/ocultar sección/reordenar/WhatsApp/revertir).
Estrategia de deploy: decidir Postgres + hosting; sin esto el producto no sale de local.
Commitear AGENTS.md.
Decisiones arquitectónicas importantes
Capas estrictas: lib/*.ts (lógica + Prisma, toda la validación y cálculo de dinero) → app/api/**/route.ts (handlers delgados, solo auth/parse/try-catch) → page.tsx (Server Components) → components (UI; los interactivos "use client" hacen fetch).
Dinero siempre en pesos enteros (Int); totales/precios se recalculan en el server desde la DB (el cliente solo manda ids + cantidades).
Estados de pedido unificados CONFIRMED→DELIVERED→CANCELLED (web orders nacen CONFIRMED); cancelación es transaccional con reversa de stock y caja.
Caja como single source of truth del dinero: cada cobro/pago genera un CashMovement deduplicado por referencia.
Stock y costos por empanado (mapas JSON en columnas String, parseados con fallback).
CMS con patrón draft/publish: el público lee valores publicados; el admin edita drafts; publicar crea un SiteVersion (snapshot para revertir). Colores vía CSS variables inyectadas en el layout; Tailwind las consume con var(--color-x, #hexFallback) para no romper el diseño.
Enums como String validados en lib/ (SQLite no tiene enums).
Auth admin minimalista: una contraseña, cookie con sha256.
Migraciones: aditivas; al reescribir tablas con datos se edita a mano el INSERT...SELECT. No hay test runner — npx tsc --noEmit es la verificación obligatoria.
Dependencias externas
Mercado Pago (mercadopago v3): pagos online. Token server-only en .env.local (MERCADOPAGO_ACCESS_TOKEN). Requiere URL pública (NEXT_PUBLIC_BASE_URL) para back_urls + webhook.
cloudflared (binario en /tmp/cloudflared): túnel para exponer localhost a MP en dev.
OpenStreetMap / Nominatim: geocoding de direcciones en el checkout (gratis, sin API key).
Google My Maps embed: mapa de puntos de venta en el home.
Google Fonts: fuentes del sitio (configurables desde el CMS).
Leaflet + leaflet-draw: dibujar zonas de entrega en el admin.
Variables de entorno requeridas: DATABASE_URL, ADMIN_PASSWORD, MERCADOPAGO_ACCESS_TOKEN, NEXT_PUBLIC_BASE_URL.
Detalle técnico completo (comandos, convenciones, patrones, errores a evitar) en AGENTS.md en la raíz del repo.