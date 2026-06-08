# HANDOFF.md — berna-co

Documento de traspaso. Captura el conocimiento acumulado durante el desarrollo para que otro agente continúe exactamente donde quedó. Léelo junto con `AGENTS.md` (convenciones/comandos) y el resumen ejecutivo.

**Estado al momento del handoff**: rama `main`, último commit `ee2b98e` ("Pre-Codex migration checkpoint"). Producto funcional, con datos reales en `prisma/dev.db`. Lo único a medio terminar: **CMS Fases 4 y 5** (publicación/preview/revert + pulido). Todo lo demás está completo y probado.

---

## 1. Decisiones técnicas y por qué

### Arquitectura en capas (lib → route → page → component)
- **Decisión**: toda la lógica de negocio, validación y mutaciones Prisma viven en `lib/<dominio>.ts`. Las rutas API son handlers delgados (auth + parse + try/catch + llamar a lib). Las páginas son Server Components que leen de lib.
- **Por qué**: la lógica se testea/reutiliza desde scripts `tsx` sin levantar HTTP; las rutas no duplican validación; el server siempre es la fuente de verdad. Esto se respetó en ~28 archivos de `lib/`.

### Dinero en enteros (pesos), recalculado en server
- **Decisión**: todos los montos son `Int` en DB y lógica. El total del pedido se recalcula en `lib/orders.ts createOrder` desde la DB; el browser solo manda `{productId, breadcrumbType, quantity}`.
- **Por qué**: evita errores de redondeo de floats y evita confiar en precios manipulables del cliente. **Orden de descuentos** (importante, replicarlo si se toca): subtotal con promos por producto → **descuento por cantidad (unidades)** → **código** → **descuento por método de pago** → envío. Cada uno sobre el subtotal de productos.

### Estados de pedido unificados
- **Decisión**: ciclo `CONFIRMED → DELIVERED → CANCELLED`. Los pedidos web **nacen CONFIRMED** (no PENDING). ManualSale y Order comparten el mismo ciclo y la misma vista.
- **Por qué**: el dueño no quería un paso intermedio "pendiente"; los pedidos web entran confirmados y él los pasa a entregado o cancelado a mano. El efectivo/transferencia entra a Caja al marcar **DELIVERED** (no al crear).

### CMS con patrón draft/publish + colores por CSS variables
- **Decisión**: el público lee valores publicados; el admin edita campos `*Draft`; publicar copiará `draft → value` y creará un `SiteVersion` (snapshot). Los colores del tema se inyectan como CSS variables en `app/layout.tsx`; `tailwind.config.ts` usa `var(--color-ink, #0A0A0A)` con el hex original como fallback.
- **Por qué**: separar borrador de publicado sin duplicar tablas. El fallback en las CSS vars garantiza que **el diseño es idéntico hasta que alguien edita un color** (cero riesgo de romper el look al introducir el CMS). Los 4 tokens semánticos reales (`ink/cream/line/muted` + `accent`) se mapearon en vez de inventar tokens abstractos (primary/secondary…) que nada referenciaba.

### Stock y costos por empanado (JSON en columnas String)
- **Decisión**: `stocks`, `prices`, `costs`, `promoPercents`, `promoTypes` son mapas `{empanado: valor}` guardados como JSON stringificado. SQLite no tiene tipos JSON/map nativos.
- **Por qué**: cada empanado (TRADITIONAL/INTEGRAL/KETO) tiene su propio precio/stock/costo. Parsear SIEMPRE con try/catch + fallback `{}`.

### Caja como única fuente del dinero
- **Decisión**: todo cobro/pago genera un `CashMovement` (INCOME/EXPENSE) con `source` y `status` (AVAILABLE/PENDING), dedupeado por `orderId`/`saleId`/`paymentId`/`purchaseId`.
- **Por qué**: un solo lugar audita el flujo de plata. MP usa `accrualDate` (money_release_date real); efectivo/transferencia entran AVAILABLE sin retraso.

### Costos = planillas tipo Excel (no recetas)
- **Decisión**: se eliminó el modelo `Recipe`/`RecipeIngredient` y se reemplazó por `CostSheet` (réplica plana del Excel del usuario). Sin promedios, sin auto-update de `Product.costs`.
- **Por qué**: el usuario quería exactamente sus planillas, no una abstracción. Las fórmulas exactas están en `lib/cost-sheets.ts` (ver §5).

### Migraciones manuales (diff + deploy)
- **Decisión**: nunca `prisma migrate dev`. Se usa `prisma migrate diff --from-migrations ... --to-schema-datamodel ... --script` → editar el `.sql` si hace falta mapear datos → `migrate deploy` → `generate`.
- **Por qué**: `migrate dev` es interactivo y no funciona en este entorno headless.

---

## 2. Refactors realizados

- **Reorganización total del admin** (commit `934c7e8`): de un menú plano a 9 secciones agrupadas (Operaciones, Finanzas, Stock, Compras, Clientes, Catálogo, Marketing, Editor, Configuración). Rutas viejas (`/admin/pedidos`) redirigen a las nuevas.
- **Unificación de pedidos + ventas** (`7fd1575`...`470c973`): `/admin/operaciones/ventas` junta Order + ManualSale con detalle compartido en `[kind]/[id]`. Se agregó cancelación transaccional, editor con re-ajuste de stock, pago/imprimir/WhatsApp/borrar.
- **kg → unidades** (`e25242e`, `34db336`): las ventas pasaron de kilos a **unidades** (`SaleItem.qtyKg` → `quantity`). El descuento por cantidad cuenta **unidades, no peso** (2 berenjenas = 2, aunque pesen 1kg). Facturación/rentabilidad pasaron a "Unidades".
- **Recetas → CostSheet** (`93608cf`): ver arriba.
- **Frontend → CMS** (`7adb899`): textos/imágenes/colores/secciones del storefront ahora salen de `lib/cms.ts` con fallback al valor hardcodeado.

---

## 3. Bugs encontrados y solucionados (para no reintroducirlos)

1. **Transacción de Caja cerrada por timeout**: `consumeDiscountCode` corría queries con el `prisma` global dentro de un `$transaction` (SQLite es single-writer). **Fix**: moverlo FUERA de la transacción, después del commit.
2. **Promo 2x1 no se reflejaba en checkout**: el carrito guardaba un snapshot sin `promoType`. **Fix**: bump de `STORAGE_KEY` a `berna-cart-v2` + endpoint `/api/cart/reprice` que refresca precios/promos al entrar al checkout.
3. **MP "auto_return invalid / back_url must be defined"**: MP rechaza URLs localhost. **Fix**: correr con `NEXT_PUBLIC_BASE_URL` = URL del túnel cloudflared.
4. **Método de pago mal en la lista**: la columna Pago solo distinguía MERCADOPAGO vs "resto", así que TRANSFERENCIA aparecía como "Efectivo al recibir". **Fix**: `webPaymentLabel()` con los 3 métodos en `lib/management.ts`.
5. **`Tooltip` de recharts**: tipa el value como `ValueType | undefined`. Usar `formatter={(v) => fmt(Number(v))}`, no `(v: number) =>`.
6. **Exportar constantes desde `page.tsx`/`layout.tsx`**: rompe el type-check de Next (`OmitWithTag ... not assignable to never`). Pasó con `CAJA_TABS`, `COMPRAS_TABS`, `EDITOR_TABS`. **Fix**: mover el array a un `lib/`. Tras tocar rutas, `rm -rf .next/types` limpia diagnósticos stale.
7. **`costo2xKg` de la planilla**: el spec textual decía dividir bolsa+etiqueta por prodFinalKg, pero los números reales del Excel mostraban suma directa. Se siguió el Excel (fuente de verdad): `costo2 = costo1 + bolsaTotal + etiquetaTotal`.

---

## 4. Partes delicadas del código (tocar con cuidado)

- **`lib/orders.ts createOrder`**: cadena de descuentos + descuento de stock con write guardado (`updateMany` con `where: { stocks: valorLeído }`) para concurrencia. Si cambiás el orden de descuentos, cambiás los totales. Registra el `StockMovement` SALE **después** del commit (reusa `unitsByVariant`).
- **`lib/sale-actions.ts cancelSale/runCancellation`**: cancelación **transaccional** — status + restock (ADJUSTMENT, sin borrar el SALE original) + Caja según estado del pago: AVAILABLE → crea EXPENSE "DEVOLUCION"; PENDING → borra el income pendiente; sin pago → no toca Caja. Todo en un `$transaction`. No se puede reactivar un cancelado.
- **`lib/cash.ts recordCashOrderIncome`**: dedupe por `orderId`. Distingue efectivo/transferencia por `source`. Se dispara al marcar DELIVERED (en `lib/admin.ts updateOrderStatus` y `lib/sale-actions.ts`).
- **`lib/mercadopago.ts syncPaymentToOrder`**: idempotente (el webhook puede dispararse varias veces). Lee `money_release_date` y crea el CashMovement PENDING/AVAILABLE. El restock al cancelar via MP también escribe StockMovement dentro de su tx.
- **`app/checkout/page.tsx`** (~800 líneas, client): replica la cadena de descuentos del server para mostrar el total en vivo. Si cambiás la lógica de `lib/orders.ts`, sincronizá acá o el total mostrado no coincide con el cobrado.
- **`lib/cms.ts loadCmsBundle`**: cacheada con `react/cache` (1 query por request). El layout root la usa para inyectar colores; si tira, cae a los hex de Tailwind.

---

## 5. Fórmulas exactas de CostSheet (no cambiar sin el Excel del usuario)

```
desperdicioKg     = compraKg - limpioKg
subtotal          = compraKg*compraPrecioUnit + huevosCantidad*huevosPrecioUnit
                    + integralKg*integralPrecioUnit + tradicionalKg*tradicionalPrecioUnit
                    + marinadaCantidad*marinadaPrecioUnit
costo1xKg         = subtotal / prodFinalKg
costo2xKg         = costo1xKg + (bolsaCantidad*bolsaPrecioUnit) + (etiquetaCantidad*etiquetaPrecioUnit)
sueldoMonto       = costo2xKg * sueldoPercent/100
utilidadesMonto   = costo2xKg * utilidadesPercent/100
precioFinal       = costo2xKg + sueldoMonto + utilidadesMonto
```
Verificado contra el ejemplo real: subtotal 48105, costo1 7758.87, costo2 8168.87, precioFinal 13478.63.

---

## 6. Deuda técnica

- **SQLite local** → no sirve para serverless (filesystem efímero). Migrar a Postgres antes de deployar: cambiar `provider` en `schema.prisma` + `DATABASE_URL`, y revisar que los JSON-en-String sigan funcionando.
- **`NEXT_PUBLIC_BASE_URL` manual**: cada túnel cloudflared nuevo cambia la URL; hay que editarla a mano y reiniciar dev para que MP ande.
- **`next@14.2.18` con advisories** en `npm audit` (no bloqueante). Decisión de actualizar pendiente.
- **Footer del detalle de producto** usa defaults hardcodeados (no lee el CMS bundle) — cosmético, los valores coinciden.
- **No hay test runner**: la verificación es `npx tsc --noEmit` + smoke tests manuales con `curl`/scripts `tsx`. No hay cobertura automatizada.
- **Editor CMS drag-and-drop**: HTML5 nativo, funcional pero básico (sin animación de reordenamiento).
- **Snapshots de SiteVersion**: la tabla existe pero está vacía (publicar aún no la llena — Fase 4).

---

## 7. Cosas que NO deben modificarse

- **Datos reales en `prisma/dev.db`**: hay ventas/pedidos reales del operador (Marcela $56.700, "Fresh market", etc.) y productos con fotos. **Nunca borrar datos que no creaste vos**; los productos `peceto-pastura` y `pechuga-pastoril` se corrompieron varias veces en tests pasados — al testear con esos, restaurar stock/fotos después.
- **El prisma singleton** (`lib/db.ts`): no instanciar `new PrismaClient()` en la app.
- **El guard de auth** en `/api/admin/*` (`isAuthenticated()` → 401). El grupo `app/admin/(panel)` redirige; `app/admin/login` queda FUERA del grupo a propósito.
- **El fallback de las CSS vars** en `tailwind.config.ts` (`var(--color-x, #hex)`): no reintroducir hex literales en componentes.
- **Las fórmulas de CostSheet** (§5).
- **El flujo de migración** (diff + deploy); no usar `migrate dev`.

---

## 8. Funcionalidades planeadas (lo que sigue)

**CMS Fase 4 — Preview y publicación (PRIORIDAD 1, parcialmente especificada):**
- Botón **"Publicar cambios"**: copiar todos los `*Draft → value`/`url`/etc., crear un `SiteVersion` con el snapshot completo (texts+images+content+sections publicados), actualizar `publishedAt`. La infra de draft ya existe; falta el endpoint + UI.
- **"Ver preview"**: ruta del sitio con `?preview=token` que renderiza los drafts (los helpers de `lib/cms.ts` ya aceptan el flag `preview`). Gatear con auth admin.
- **"Descartar cambios"**: copiar `value → valueDraft` (revertir drafts).
- **Historial de versiones**: listar últimos 20 `SiteVersion` + "Revertir a esta versión" (restaura el snapshot, doble confirmación).
- El componente `EditorStatusBar` ya muestra "X cambios sin publicar" (lee `/api/admin/cms/pending`); falta sumarle los botones.

**CMS Fase 5 — Pulido**: tour del editor (primera vez), confirmación al salir con drafts pendientes, export/import de backup JSON, "modo seguro" que bloquea publicar con valores rotos (contraste imposible, texto vacío obligatorio, fuente no disponible).

**Verificación final del CMS** (6 casos del spec original): cambiar color principal → publicar → ver reflejado; cambiar título hero → preview → publicar; ocultar sección → publicar; reordenar → publicar; editar WhatsApp con placeholders → pedido de prueba; revertir versión.

**Operacional (no CMS)**:
- Migración a Postgres + estrategia de deploy.
- Probar el flujo MP punta a punta con túnel cuando se retome.

---

## 9. Cómo retomar (checklist rápido)

1. `npm run dev`; si vas a probar MP, levantar túnel cloudflared y actualizar `NEXT_PUBLIC_BASE_URL`.
2. Para Fase 4: crear `lib/cms-publish.ts` (publish/discard/revert), rutas en `/api/admin/cms/{publish,discard,revert}`, y el preview en las páginas públicas leyendo `?preview` (validar auth). Reusar `loadCmsBundle(preview=true)`.
3. Antes de terminar cualquier cambio: `npx tsc --noEmit` limpio + smoke test del flujo. Limpiar datos de prueba. Commit en español, una unidad por commit.
