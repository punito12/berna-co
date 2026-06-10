# Plan Phase 1: migracion segura SQLite -> Neon Postgres

Este documento prepara la migracion futura a Neon Postgres sin cambiar el
runtime actual. En esta fase el proyecto sigue usando SQLite local para
desarrollo.

## Decision de Phase 1

- `prisma/schema.prisma` queda con `provider = "sqlite"` por ahora.
- `prisma/migrations/migration_lock.toml` queda con `provider = "sqlite"`.
- Las migraciones SQLite existentes se conservan como historial local.
- No se corre `prisma migrate dev`, `db:reset`, ni migraciones contra Neon.
- No se importan datos todavia.

Cambiar el provider a `postgresql` ahora romperia el flujo local actual porque:

- `.env` apunta a `DATABASE_URL="file:./dev.db"`.
- Las migraciones existentes contienen SQL especifico de SQLite.
- `migration_lock.toml` esta bloqueado a SQLite.
- El equipo todavia necesita leer y verificar los datos reales de `prisma/dev.db`
  antes de migrarlos.

## Estado actual relevante

- Base local: `prisma/dev.db`.
- Prisma schema: `prisma/schema.prisma`.
- Provider actual: `sqlite`.
- Migraciones actuales: `prisma/migrations/*/migration.sql`.
- Lock actual: `prisma/migrations/migration_lock.toml`.
- Seeds:
  - `prisma/seed.ts`
  - `prisma/seed-cms.ts`
- Prisma client singleton: `lib/db.ts`.

Los modelos usan mayormente tipos portables (`String`, `Int`, `Float`,
`Boolean`, `DateTime`). Los campos con JSON de negocio/CMS estan guardados como
`String`, lo cual reduce el riesgo de incompatibilidad para la primera migracion.

## Estrategia recomendada de baseline Postgres

No reutilizar directamente las migraciones SQLite en Neon. Esas migraciones
incluyen detalles propios de SQLite como `PRAGMA`, redefinicion de tablas y tipos
SQL generados para SQLite.

Para Neon conviene crear una baseline limpia de Postgres desde el schema actual:

1. Crear una rama dedicada, por ejemplo `infra/neon-postgres`.
2. Hacer backup de `prisma/dev.db`.
3. Preparar un schema Postgres temporal o cambiar el provider en la rama.
4. Usar una base Neon vacia de staging.
5. Generar una migracion baseline Postgres desde cero.
6. Aplicar esa baseline solo en Neon staging.
7. Recién despues importar datos desde SQLite.

La baseline Postgres debe representar el schema actual completo, no cada paso
historico SQLite.

## Checkpoint de rama recomendado

Antes de cambiar provider o generar una baseline real, crear un checkpoint Git:

```bash
git status
git checkout -b infra/neon-postgres-baseline
```

No es obligatorio crear la rama durante Phase 3-A, pero si es recomendable antes
de tocar `prisma/schema.prisma` o `prisma/migrations`.

## Pasos futuros para crear la DB Neon

Cuando se apruebe la fase de infraestructura:

1. Crear proyecto Neon.
2. Crear dos bases o branches:
   - staging
   - production
3. Guardar `DATABASE_URL` de staging en Vercel Preview/Staging.
4. Guardar `DATABASE_URL` de production solo en Vercel Production.
5. No usar `db:reset` contra Neon.
6. No correr seeds contra una base con datos reales salvo aprobacion explicita.

Formato esperado:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
```

Variables para la migracion de datos en staging:

```env
SOURCE_SQLITE_PATH="prisma/dev.db"
TARGET_DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/STAGING?sslmode=require"
CONFIRM_SQLITE_TO_POSTGRES_IMPORT="YES"
```

`SOURCE_SQLITE_PATH` y `TARGET_DATABASE_URL` son intencionalmente distintos de
`DATABASE_URL` para evitar escribir por accidente en la base activa de la app.

## Pasos futuros para generar baseline Postgres

Opcion recomendada:

1. Crear una copia/rama de trabajo.
2. Cambiar temporalmente:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Generar SQL contra una DB vacia usando Prisma Migrate Diff o un flujo de
   baseline controlado.
4. Revisar manualmente la migracion antes de aplicarla.
5. Aplicar en Neon staging.
6. Correr:

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
```

Nota: esta fase no debe mezclarse con migracion de datos.

Flujo seguro sugerido para baseline:

```bash
# En una rama dedicada, con una DB Neon staging vacia.
cp prisma/dev.db /tmp/berna-before-postgres-baseline.db

# Cambiar provider a postgresql solo en esa rama/fase aprobada.
npx prisma validate

# Generar SQL de baseline revisable contra schema actual.
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/berna-postgres-baseline.sql
```

Despues revisar manualmente `/tmp/berna-postgres-baseline.sql`. Solo cuando este
aprobado, crear una carpeta de migracion Postgres para staging. No mezclar esa
baseline con las migraciones SQLite existentes sin una decision explicita.

## Estrategia futura de migracion de datos

La forma mas segura es un script TypeScript dedicado que lea SQLite y escriba en
Neon, preservando IDs y timestamps. Evitar SQL manual si no es necesario.

Reglas:

- Hacer backup antes de correr cualquier import.
- Importar primero en Neon staging.
- Preservar IDs (`id`) existentes.
- No recalcular totales de pedidos, ventas, caja o stock.
- No ejecutar logica de negocio durante la importacion.
- No correr seeds encima de datos reales.
- El script debe ser idempotente solo si se disena explicitamente para eso; si
  no, usar una base staging vacia por corrida.

Orden recomendado de importacion:

1. Configuracion y tablas independientes:
   - `PricingConfig`
   - `PaymentMethodConfig`
   - `AvailableDeliveryDay`
   - `DeliverySlot`
   - `Zone`
   - `Barrio`
   - `Supplier`
   - `DiscountCode`
   - `QuantityDiscount`
   - `Subscriber`
   - `SiteContent`
   - `SiteText`
   - `SiteImage`
   - `SiteSection`
   - `SiteVersion`
2. Catalogo:
   - `Product`
   - `CompetitorPrice`
3. Clientes:
   - `Customer`
4. Operacion:
   - `Order`
   - `OrderItem`
   - `ManualSale`
   - `SaleItem`
   - `Purchase`
   - `PurchaseItem`
5. Finanzas, stock e historial:
   - `Payment`
   - `SupplierPayment`
   - `CashMovement`
   - `StockMovement`
   - `CostSheet`
   - `CostHistory`
   - `PriceHistory`

Phase 3-A agrega el script:

```bash
npm run migrate:sqlite-to-postgres
```

Modo dry-run, sin escribir en Postgres:

```bash
SOURCE_SQLITE_PATH=prisma/dev.db \
TARGET_DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/STAGING?sslmode=require" \
npm run migrate:sqlite-to-postgres -- --dry-run
```

Modo import real, solo staging y con confirmacion explicita:

```bash
CONFIRM_SQLITE_TO_POSTGRES_IMPORT=YES \
SOURCE_SQLITE_PATH=prisma/dev.db \
TARGET_DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/STAGING?sslmode=require" \
npm run migrate:sqlite-to-postgres -- --execute
```

El script:

- No corre seeds.
- No borra datos.
- Rechaza targets no vacios.
- Requiere env vars explicitas.
- Preserva IDs y timestamps.
- Importa en orden de dependencias.
- Compara conteos al final.
- Solo permite `--execute` cuando `prisma/schema.prisma` ya esta en
  `provider = "postgresql"` y el Prisma Client fue regenerado para esa fase.

Requisito: el comando `sqlite3` debe estar disponible en la maquina que corre el
script.

## Verificacion futura de datos

Comparar SQLite vs Neon:

- Cantidad de filas por tabla.
- Suma de `Order.total`.
- Suma de `ManualSale.net`.
- Suma de `Purchase.total`.
- Suma de `CashMovement.amount` por `type` y `status`.
- Total de stock por producto.
- Cantidad de `StockMovement`.
- Cantidad de textos, imagenes, secciones y versiones CMS.
- Productos con `imageUrl` y JSON `images` parseable.
- Configuracion de pagos y zonas.

Consultas de verificacion sugeridas:

```sql
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Order";
SELECT SUM("total") FROM "Order";
SELECT COUNT(*) FROM "ManualSale";
SELECT SUM("net") FROM "ManualSale";
SELECT "type", "status", SUM("amount") FROM "CashMovement" GROUP BY "type", "status";
SELECT COUNT(*) FROM "StockMovement";
SELECT COUNT(*) FROM "SiteText";
SELECT COUNT(*) FROM "SiteImage";
SELECT COUNT(*) FROM "SiteSection";
```

Despues, verificar en la app:

- Admin login.
- Productos.
- Pedidos y ventas.
- Caja.
- Stock.
- Compras.
- Clientes.
- CMS preview/publicacion.
- Checkout con pedido de prueba en staging.
- Cancelacion de un pedido de prueba en staging.

## Riesgos pendientes

- Las migraciones SQLite no son portables a Postgres.
- Un import mal ordenado puede romper relaciones.
- Correr seeds contra Neon con datos reales puede pisar informacion.
- Cambiar `DATABASE_URL` local por Neon accidentalmente puede escribir datos de
  prueba en una base remota.
- La migracion de imagenes a Blob es una fase separada; esta guia no la ejecuta.

## Comandos seguros usados en Phase 1

Backup local no destructivo:

```bash
mkdir -p /tmp/berna-co-backups
cp -p prisma/dev.db /tmp/berna-co-backups/dev-before-neon-phase1-YYYYMMDDHHMMSS.db
```

Checks permitidos:

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
```
