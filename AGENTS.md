# AGENTS.md — berna-co

## Proyecto

Tienda online + panel de gestión para Berna&co (milanesas/empanados premium congelados). Una sola app Next.js que sirve el storefront público (catálogo, checkout) y el panel admin completo (pedidos, ventas, caja, cuentas corrientes, compras, stock, costos/precios, CMS del sitio).

## Stack

- **Next.js 14.2** (App Router) + **React 18.3** + **TypeScript 5.6** (`strict: true`).
- **Prisma 5.22** sobre **SQLite** (`prisma/dev.db`, archivo local).
- **Tailwind CSS 3.4** (con tokens de color custom + CSS variables del CMS).
- **Mercado Pago** SDK v3 (Checkout Pro) — token server-only.
- **recharts** (gráficos del admin), **leaflet** + **leaflet-draw** (zonas de entrega).
- Sin librería de tests, sin componentes UI externos, sin estado global salvo el carrito (Context + localStorage).
- Node 18+. Ejecutar scripts `.ts` con `tsx`.

## Arquitectura

- **App Router**. Las páginas y rutas API viven en `app/`.
- **Patrón de capas (respetar siempre):**
  1. **`lib/*.ts`** = lógica de negocio + acceso a DB (Prisma). TODA la validación, cálculo de precios/totales y mutaciones pasan acá.
  2. **`app/api/**/route.ts`** = handlers HTTP delgados. Solo: chequear auth, parsear body, llamar a una función de `lib/`, mapear errores a JSON. No meter lógica de negocio en las rutas.
  3. **`app/**/page.tsx`** = Server Components por defecto; leen de `lib/` directamente. Pasan datos a Client Components (`"use client"`) vía props.
  4. **`components/*.tsx`** = UI. Los interactivos son `"use client"` y llaman a las rutas API con `fetch`.
- **Prisma client**: importar SIEMPRE `import { prisma } from "@/lib/db"` (singleton cacheado en `globalThis`). Nunca instanciar `new PrismaClient()` en código de la app.
- **Auth admin**: una sola contraseña (`ADMIN_PASSWORD`) → cookie `berna-admin` con el sha256. El grupo `app/admin/(panel)/layout.tsx` redirige a `/admin/login` si no hay sesión. `app/admin/login` está FUERA del grupo. Toda ruta `/api/admin/*` debe empezar con `if (!isAuthenticated()) return 401`.
- **Money**: pesos enteros (Int) en toda la base y la lógica. Formatear solo para mostrar con `formatPrice` / `Intl.NumberFormat("es-AR")`.
- **Enums**: SQLite no tiene enums. Se guardan como String y se validan en `lib/` contra arrays declarados (ej. `PAYMENT_METHODS`, `ORDER_STATUSES`). Documentar los valores permitidos en un comentario inline en el schema.
- **JSON en columnas String**: mapas por-empanado (`prices`, `stocks`, `costs`, `promoPercents`...) y configs (`themeColors`, `config`) se guardan como JSON stringificado. Parsear con try/catch y fallback (nunca dejar que un JSON corrupto crashee).
- **CMS**: el sitio público lee textos/imágenes/colores/secciones de la DB vía `lib/cms.ts` (`loadCmsBundle` + `getSiteText/Image/ThemeColors/Sections`), con fallback al valor hardcodeado. Las ediciones del admin escriben SOLO en campos `*Draft` (`lib/cms-admin.ts`); publicar copia `draft → value`. Colores se inyectan como CSS vars en `app/layout.tsx`; Tailwind las consume vía `var(--color-ink, #hex)`.

## Estructura de carpetas

```
app/
  layout.tsx                # root: fuentes + inyección de CSS vars del tema (CMS)
  page.tsx                  # home (storefront, render dinámico de secciones del CMS)
  producto/[slug]/          # detalle de producto
  checkout/                 # checkout (client component grande)
  pedido/{confirmado,transferencia,pendiente,error}/
  admin/
    login/                  # fuera del guard
    (panel)/                # grupo guardado por auth; layout con AdminNav
      page.tsx              # dashboard
      operaciones/ventas/   # vista unificada Order + ManualSale + detalle [kind]/[id]
      caja/ finanzas/ compras/ stock/ catalogo/ config/ editor/ ...
  api/
    admin/**/route.ts       # mutaciones del panel (auth-gated)
    **/route.ts             # endpoints públicos (orders/create, cart/reprice, mp/webhook, cms/texts...)
lib/                        # lógica de negocio + Prisma (una unidad por dominio)
components/                 # UI (server + client)
prisma/
  schema.prisma             # modelo de datos
  migrations/               # migraciones SQL (NO editar a mano salvo data-mapping)
  seed.ts / seed-cms.ts     # seeds
public/images/              # uploads (productos/, branding/)
```

## Comandos

**Desarrollo**
```bash
npm run dev            # next dev en :3000
```

**Build**
```bash
npm run build          # next build
npm run start          # next start (prod)
```

**Lint / Typecheck (NO hay test runner — esto ES la verificación)**
```bash
npx tsc --noEmit       # OBLIGATORIO antes de terminar cualquier cambio
npm run lint           # next lint
```

**Base de datos / Prisma (SQLite)**
```bash
npx prisma generate    # regenerar client tras cambiar schema
npm run db:seed        # seed catálogo/datos
npm run db:seed:cms    # seed contenido CMS (textos/imágenes/secciones)
npm run db:reset       # reset + ambos seeds (DESTRUCTIVO)
```

**Migraciones — usar SIEMPRE este flujo (NO `prisma migrate dev`, que no anda en este entorno):**
```bash
MIG="prisma/migrations/$(date +%Y%m%d%H%M%S)_nombre"
mkdir -p "$MIG"; rm -f prisma/shadow.db
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "file:./shadow.db" --script > "$MIG/migration.sql"
rm -f prisma/shadow.db
npx prisma migrate deploy
npx prisma generate
```
Si la migración reescribe una tabla con datos (rename/type-change de columna), editar a mano el `INSERT INTO ... SELECT` del `.sql` para mapear los datos viejos antes del `deploy`. Hacer backup (`cp prisma/dev.db /tmp/dev.db.bak`) antes de migrar tablas con datos reales.

**MP / túnel (probar pagos web)**: Mercado Pago necesita URL pública. Levantar cloudflared (`/tmp/cloudflared tunnel --url http://localhost:3000`), poner la URL en `NEXT_PUBLIC_BASE_URL` de `.env.local` y reiniciar `dev`.

## Convenciones de código

- TypeScript estricto. Alias de import `@/*` → raíz (ej. `@/lib/orders`, `@/components/X`).
- Comillas dobles, sin punto y coma omitidos (siguen el estilo del archivo: con `;`). Imitar el estilo del archivo circundante: densidad de comentarios, naming, idioms.
- Comentarios y texto de UI en **español**; nombres de variables/funciones en **inglés**.
- Componentes: `PascalCase`. Funciones/vars: `camelCase`. Archivos de `lib/`: `kebab-case.ts`, uno por dominio.
- Server Component por defecto; agregar `"use client"` solo si hay estado/eventos/hooks.
- Respuestas de API: éxito `{ ok: true, ...}`; error `{ error: "mensaje en español" }` con status 400/401/503/500. Validación esperada → 400; no autorizado → 401; bug inesperado → log + 500 genérico.
- Validación e invariantes viven en `lib/`, NO en la ruta ni en el cliente (el cliente solo da feedback amable; el server revalida).
- Precios y totales se **recalculan siempre en el server** desde la DB (`lib/orders.ts createOrder`). El browser solo manda ids + cantidades.
- Sub-tabs de secciones (`CAJA_TABS`, `COSTOS_TABS`, etc.): definir el array en el `lib/` del dominio y exportarlo desde ahí. **NUNCA exportar constantes arbitrarias desde un `page.tsx`/`layout.tsx`** (Next.js solo permite exports específicos en route files → rompe el build).

## Patrones existentes a respetar

- **Nueva mutación**: función en `lib/<dominio>.ts` (valida + usa `prisma`) → ruta `app/api/admin/<x>/route.ts` (auth + parse + try/catch) → componente client que hace `fetch` y `router.refresh()`.
- **Estados de pedido/venta**: ciclo unificado `CONFIRMED → DELIVERED → CANCELLED` (web orders nacen CONFIRMED). La cancelación es **transaccional** (`prisma.$transaction`): estado + restock de stock (StockMovement ADJUSTMENT, sin borrar el SALE original) + ajuste de Caja según el estado del pago. Está en `lib/sale-actions.ts`.
- **Caja (CashMovement)**: cada cobro/pago genera un movimiento INCOME/EXPENSE con `source` y `status` (AVAILABLE/PENDING). MP usa `accrualDate` (money_release_date); efectivo/transferencia entran AVAILABLE al marcar entregado. Dedupe por `orderId`/`saleId`/`paymentId`. Ver `lib/cash.ts`, `lib/payments.ts`, `lib/purchases.ts`.
- **Stock**: por empanado (mapa JSON `stocks`). Mutar siempre vía `lib/stock.ts` (`applyStockDelta`/`adjustStockForLines`) que mantiene el total y escribe un `StockMovement` auditable. Ventas descuentan al crear; cancelar/editar reajustan por diferencia.
- **Cuenta corriente (CxC/CxP)**: mayoristas nacen PENDING + dueDate; el ingreso a Caja lo crea el `Payment`/`SupplierPayment`, no la venta/compra. `paymentStatus` se recalcula de la suma de pagos.
- **Costos/Precios**: planillas planas tipo Excel (`CostSheet`, fórmulas exactas en `lib/cost-sheets.ts`); la tabla maestra de precios edita inline con historial (`CostHistory`/`PriceHistory`). NO promediar planillas ni autoactualizar `Product.costs`.
- **WhatsApp**: `lib/whatsapp.ts` arma el mensaje del pedido; la plantilla editable del CMS soporta placeholders `{pedidoId}`, `{total}`, `{cliente}`.
- **Vista unificada de ventas**: pedidos web (Order) + ventas manuales (ManualSale) se muestran juntos en `/admin/operaciones/ventas` con detalle en `[kind]/[id]` (kind = `order`|`sale`). `/admin/pedidos` redirige a la unificada.
- **Diagnósticos del IDE atrasan**: tras editar, el "error" suele ser estado intermedio. La fuente de verdad es `npx tsc --noEmit`.

## Errores comunes a evitar

- ❌ Meter lógica/validación en una ruta API → va en `lib/`.
- ❌ `new PrismaClient()` en la app → usar `@/lib/db`.
- ❌ Olvidar el guard `isAuthenticated()` en una ruta `/api/admin/*`.
- ❌ Usar `prisma migrate dev` (no funciona acá) → usar el flujo `diff` + `deploy` de arriba.
- ❌ Migrar una tabla con datos sin mapear el `INSERT...SELECT` ni hacer backup → se pierden datos.
- ❌ Exportar constantes desde `page.tsx`/`layout.tsx` → rompe el type-check de Next (`OmitWithTag ... not assignable to never`). Mover a `lib/`. Tras tocar rutas, `rm -rf .next/types` para limpiar diagnósticos stale.
- ❌ Confiar montos/precios del cliente → recalcular en server.
- ❌ Parsear JSON de columnas sin try/catch + fallback.
- ❌ Floats para dinero → enteros (pesos).
- ❌ El formatter de `Tooltip` de recharts tipa el valor como `ValueType | undefined`: usar `formatter={(v) => fmt(Number(v))}` (no `(v: number) =>`).
- ❌ Romper el diseño al tocar colores: los tokens Tailwind ya son `var(--color-x, #hex)`; el hex de fallback mantiene el look. No reintroducir hex literales.
- ❌ El CMS escribe en `*Draft`; nunca tocar el campo publicado directo (publicar es el único camino draft→value).

## Cómo agregar funcionalidad sin romper la arquitectura

1. **Modelo nuevo / campo nuevo**: editar `prisma/schema.prisma` → `npx prisma validate` → migración con el flujo `diff`+`deploy` (mapear datos si reescribe tabla) → `npx prisma generate`. Aditivo siempre que se pueda (columnas nullable / con default).
2. **Lógica**: crear/extender `lib/<dominio>.ts` con la validación y las queries Prisma. Reusar helpers existentes (`lib/cash`, `lib/stock`, `lib/payments`) en vez de duplicar efectos.
3. **Endpoint**: `app/api/admin/<x>/route.ts` delgado, con auth + parse + try/catch, llamando a la función de `lib/`.
4. **UI admin**: agregar la ruta bajo `app/admin/(panel)/...`; sumar el link a `components/AdminNav.tsx` (sección correspondiente). Sub-tabs como const en el `lib/` del dominio. Componente interactivo `"use client"` que hace `fetch` + `router.refresh()`.
5. **UI pública**: textos/imágenes nuevos van como filas del CMS (agregar al `prisma/seed-cms.ts` con su `key`, `maxLength`, `category`) y se leen con `getSiteText`/`getSiteImage` con fallback. El componente recibe el texto por prop desde la página (server) o lo trae de `/api/cms/texts` si es client (como el checkout).
6. **Verificar**: `npx tsc --noEmit` limpio, reiniciar `dev`, probar el flujo end-to-end (crear/editar/cancelar) y confirmar que no se rompió Caja/stock (sin doble conteo). Limpiar cualquier dato de prueba creado; no borrar datos reales del operador.
7. **Commits**: uno por unidad lógica de trabajo, mensaje claro en español.
