# CLAUDE.md — Berna&co Sitio Web

## El negocio
Berna&co vende milanesas congeladas premium artesanales bajo el tagline
"LA VIDA ES RICA!". Hoy los clientes piden por WhatsApp; este sitio reemplaza
ese flujo. El cliente elige productos + variante de empanado, elige delivery
o pick-up, elige día y horario, y paga.

## Quién lo construye
Soy NUEVO en código. Optimizá para claridad y confiabilidad.
- Antes de escribir código, explicá en 1-2 oraciones qué vas a hacer.
- Después de cada cambio, decime qué cambió y cómo verlo.
- Sin jerga técnica sin explicación.

## Cómo trabajamos
- Pasos CHICOS. Correr la app después de cada cambio y confirmar sin errores.
- Seguir el orden de `docs/ROADMAP.md`. Un paso a la vez.
- Antes de cualquier cambio grande, explicar el plan y esperar mi OK.
- Commit de git después de cada paso que funcione.
- Cuando reporto un error, encontrar y explicar la causa antes de arreglar.
- Nunca ocultar errores — mostrar siempre un mensaje claro.

## Prioridad de construcción
PRIMERO y más importante: la página para el cliente (catálogo + carrito +
checkout con sistema de entregas). El panel de administración es secundario
y se construye después.

## Spec detallada
Cuando empezás una feature, PRIMERO leer `docs/ROADMAP.md`.

## Stack (no cambiar sin preguntarme)
- Framework: Next.js (App Router) + TypeScript
- Estilos: Tailwind CSS
- Base de datos: SQLite via Prisma ORM
- Pagos: Mercado Pago Checkout Pro
- Imágenes: archivos estáticos en `/public/images/productos/`
- Package manager: npm

## Identidad visual (MUY IMPORTANTE — leer antes de escribir cualquier UI)
Ver la sección "Sistema de diseño" en docs/ROADMAP.md. No improvisar estilos.
El sitio debe verse como el catálogo físico de Berna&co, no como un e-commerce
genérico. Toda decisión visual se guía por esas reglas.

## Idioma
- Código en inglés. UI al cliente en español argentino, tuteando.

## Estructura del proyecto
- `app/` — páginas y UI
- `app/api/` — rutas servidor (claves secretas solo aquí)
- `components/` — un componente por archivo
- `lib/` — lógica de negocio
- `prisma/schema.prisma` — schema
- `public/images/productos/` — fotos de productos
- `docs/ROADMAP.md` — spec completa
- `.env.local` — claves (NUNCA commitear)

## Comandos
- `npm install` — instalar dependencias
- `npm run dev` — correr en http://localhost:3000
- `npx prisma migrate dev` — aplicar cambios de schema
- `npx prisma studio` — ver la base de datos
- `npm run build` — build de producción

## Seguridad
- Claves solo en `.env.local`, leídas solo en `app/api/`.
- `.env.local` en `.gitignore`. Nunca commitear secretos.
- Vars: `MERCADOPAGO_ACCESS_TOKEN`, `ADMIN_PASSWORD`, `DATABASE_URL`.

## Convenciones
- TypeScript en todos lados; código simple y legible.
- Un componente por archivo, nombres descriptivos.
- Lógica de negocio en `lib/` con funciones pequeñas y comentadas.

## NO hacer
- No agregar librerías no listadas sin preguntarme.
- No construir varias features a la vez.
- No exponer claves al browser, nunca.
- No inventar copy, precios ni descripciones — usar solo lo del ROADMAP.
- No construir panel de admin hasta que yo lo pida.

## Para más adelante
- Entrega por zonas (configurar días por zona, ej: Lunes/Martes = San Isidro).
- Deploy a producción (Vercel + Supabase).
- Descuentos y códigos promocionales.
