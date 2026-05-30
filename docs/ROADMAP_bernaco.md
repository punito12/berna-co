# ROADMAP.md — Berna&co Spec, Diseño y Orden de Construcción

---

## Sistema de diseño (leer SIEMPRE antes de escribir UI)

### Personalidad de la marca
Premium artesanal. Austero y confiado. No colorido ni genérico.
El sitio debe sentirse como el catálogo físico: bold, limpio, con carácter.
Slogan: **"LA VIDA ES RICA!"**

### Paleta de colores
```
Negro:        #0A0A0A   (fondo hero, footer, botones primarios, texto fuerte)
Blanco:       #FFFFFF   (fondo del resto del sitio, texto sobre negro)
Crema:        #F5F0EB   (fondo alternativo suave para secciones de productos)
Gris claro:   #E8E3DC   (bordes, separadores)
Gris texto:   #6B6560   (texto secundario, pesos, descripciones)
```
No usar otros colores. Sin gradientes. Sin colores de acento vivos.

### Tipografía (Tailwind classes)
- Títulos principales: `font-black uppercase tracking-tight` (ej: "BERNA & CO")
- Subtítulos: `font-bold uppercase tracking-wide text-sm` (ej: "CONGELADOS CASEROS")
- Cuerpo: `font-normal` texto gris oscuro, tamaño normal
- Precio: `font-black text-2xl text-black`
- Botones: `font-bold uppercase tracking-widest text-sm`

### Logo (componente reutilizable `<BernaLogo />`)
Replicar exactamente el estilo del catálogo:
```
┌─────────────────────────────┐
│  • FROM C. S. BERNA KITCHEN •  │
│                             │
│  ▌  BERNA & CO              │
│     CONGELADOS CASEROS      │
└─────────────────────────────┘
```
Implementar con `border-2 border-current p-4` y las tipografías de arriba.
Versión blanca (sobre fondo negro) y versión negra (sobre fondo claro).

### Sección Hero (página principal, parte oscura)
- Fondo: negro `bg-[#0A0A0A]`, altura mínima `min-h-screen`
- Imagen de fondo (foto del catálogo — las milanesas apiladas en tabla de madera)
  con overlay negro semitransparente `bg-black/60`
- Contenido centrado:
  - Logo blanco grande
  - Headline: "MILANESAS PREMIUM" en blanco, font-black uppercase tracking-tight
  - Subline: "de nuestra cocina a tu freezer" en crema, font-light italic
  - CTA button: `bg-white text-black font-bold uppercase tracking-widest px-8 py-4`
    texto "Ver productos"
  - Slogan "LA VIDA ES RICA!" como badge vertical o banner inferior

### Resto del sitio (parte clara)
- Fondo: blanco o crema `bg-[#F5F0EB]`
- Texto: negro o gris oscuro
- Secciones con `py-16 px-4 max-w-6xl mx-auto`

### Cards de producto
```
bg-white rounded-lg overflow-hidden shadow-sm border border-[#E8E3DC]
```
- Foto del producto arriba (aspect-ratio cuadrado o 4/3)
- Badge de categoría (ej: "CARNE", "POLLO", "VEGANO") top-right
- Badge "NEW" si aplica (negro, uppercase)
- Nombre en uppercase font-bold
- Peso en gris: "1 kg"
- Descripción corta en gris texto pequeño
- Selector de empanado: pills/chips seleccionables (ver más abajo)
- Precio en negro font-black
- Botón "Agregar": `bg-black text-white` full-width

### Selector de empanado (pills)
Para cada opción disponible del producto:
```
border border-black px-3 py-1 text-xs font-bold uppercase rounded-full
```
Seleccionado: `bg-black text-white`
No seleccionado: `bg-white text-black`

### Footer
Barra negra `bg-[#0A0A0A]` con "LA VIDA ES RICA!" en blanco, centrado.
Logo pequeño blanco. Instagram: @berna.and.co

### Mobile-first
Todo el layout pensado para 390px de ancho primero. El checkout especialmente
debe ser cómodo en celular — pasos claros, botones grandes, formularios simples.

### Badges de calidad (mostrar en la página, en alguna sección)
- "Marinadas 24 hs"
- "Huevos agroecológicos certificados"
- "Se cocinan directo desde el freezer"
- "Congeladas individualmente"
- "6 meses en freezer"

---

## Catálogo de productos (datos reales — usar exactamente estos)

### Línea Premium (1 kg por paquete)
Empanados disponibles: Tradicional, Integral orgánico con semillas, Keto*

| Nombre              | Descripción                                                                 | Keto | Badge |
|---------------------|-----------------------------------------------------------------------------|------|-------|
| Peceto de Pastura   | Corte de carne vacuna de alta calidad, de animales criados a pasto.        | ✅   | NEW   |
| Peceto              | Carne de novillos, de primera calidad.                                     | ❌   |       |
| Pechuga Pastoril    | Pechuga de pollos criados en libertad y alimentados con granos. Sin hormonas ni antibióticos. | ✅ | |
| Bife de Chorizo     | Corte prémium, magro y tierno, con gran sabor y textura.                   | ❌   |       |
| Cerdo               | Elaboradas con carré fresco, calidad de exportación.                       | ❌   |       |

*Keto solo disponible en Peceto de Pastura y Pechuga Pastoril.

### Long Chicken Fingers (750 g)
"Mini supremitas 100% pechuga pastoril. Sin procesar. Sin conservantes."
Empanado: solo Tradicional (confirmar si hay Integral)
Categoría: POLLO

### Berenjena (500 g)
Milanesa de berenjena. Categoría: VEGANO
Empanado: Tradicional

### Gírgolas (500 g)
Milanesa de gírgolas. Categoría: VEGANO
Empanado: Tradicional

**Precios:** el admin los carga desde el panel. No hardcodear precios en código.
**Fotos:** `/public/images/productos/[nombre-slug].jpg`
  Ej: `peceto-pastura.jpg`, `bife-chorizo.jpg`, `long-chicken-fingers.jpg`

---

## Modelo de datos (Prisma schema)

**Product**
- id, name, description, slug, weightGrams, category (CARNE|POLLO|CERDO|VEGANO)
- price, imageUrl, available (bool), isNew (bool)
- availableBreadcrumbs: String (JSON array: ["TRADITIONAL","INTEGRAL","KETO"])

**Order**
- id, createdAt, status (PENDING|CONFIRMED|READY|DELIVERED|CANCELLED)
- customerName, customerPhone, customerEmail (opcional)
- deliveryType (DELIVERY | PICKUP)
- address (solo para DELIVERY)
- scheduledDate, scheduledSlot (ej: "10:00–12:00")
- paymentMethod (MERCADOPAGO | CASH)
- total, mpPaymentId (null si paga en efectivo), notes

**OrderItem**
- id, orderId, productId, quantity, priceAtTime
- breadcrumbType (TRADITIONAL | INTEGRAL | KETO)

**DeliverySlot**
- id, label (ej: "10:00–12:00"), available (bool)
- Para v1: slots fijos que el admin activa/desactiva.
- Para más adelante: slots por zona y por día de la semana.

**AvailableDeliveryDay**
- id, dayOfWeek (0=Dom…6=Sáb), available (bool)
- Para v1: el admin marca qué días de la semana se hacen entregas.

---

## Flujo del cliente (paso a paso)

1. **Landing / Hero** — entra, ve la marca, CTA "Ver productos"
2. **Catálogo** — grilla de productos con foto, descripción, selector de
   empanado, precio, botón "Agregar al carrito"
3. **Carrito** — lista de items con variante elegida, cantidades editables,
   total. Botón "Continuar".
4. **Checkout** — formulario en pasos claros:
   a. Datos: nombre, teléfono, email (opcional), nota (opcional)
   b. Entrega: Delivery (dirección) o Pick-up (sin dirección)
   c. Cuándo: selector de fecha (solo días habilitados por el admin) +
      selector de horario (slots habilitados)
   d. Pago: Mercado Pago o Efectivo al recibir
   e. Resumen y confirmar
5. **Confirmación** — número de pedido, resumen completo, botón
   "Compartir por WhatsApp" que abre WA con el detalle del pedido preescrito.
   Si eligió MP, primero redirige a Mercado Pago y vuelve acá.

### Sistema de entregas (detalle importante)
- El admin configura desde el panel qué días de la semana hay entregas
  (ej: Lunes, Miércoles, Viernes) y qué horarios están disponibles.
- El cliente ve un calendar picker donde SOLO los días habilitados son
  seleccionables (los demás aparecen grises/deshabilitados).
- Al elegir la fecha, ve solo los slots de horario activos.
- Para más adelante (NO construir ahora): el admin asigna días por zona
  geográfica. El cliente ingresa su dirección y el sistema filtra los días
  disponibles para su zona.

---

## Panel de administración (construir DESPUÉS del sitio cliente)

Ruta `/admin` protegida por password middleware (variable `ADMIN_PASSWORD`).

- **Pedidos**: lista filtrable por estado y fecha. Ver detalle. Cambiar estado.
- **Productos**: editar precio y disponibilidad. No crear/eliminar en v1.
- **Slots y días**: activar/desactivar días de entrega y horarios.

---

## Integración Mercado Pago

Checkout Pro (redirección a MP — la más simple).

1. `app/api/orders/create` guarda pedido en PENDING y crea preferencia en MP.
2. Cliente redirige a MP, paga allí.
3. `app/api/mp/webhook` recibe notificación y actualiza estado.
4. Páginas de retorno: éxito (`/pedido/confirmado`), pendiente, fracaso.
5. Testear con credenciales sandbox antes de producción.

Credenciales: `MERCADOPAGO_ACCESS_TOKEN` del panel de vendedor de MP.

---

## Orden de construcción

### Paso 1 — Scaffold + catálogo visual
- Proyecto Next.js + TypeScript + Tailwind + Prisma + SQLite.
- Schema completo (Product, Order, OrderItem, DeliverySlot, AvailableDeliveryDay).
- Cargar los 8 productos con datos reales (precios placeholder: 0).
- Página principal: hero oscuro + sección de productos con grilla de cards.
- Cards con selector de empanado funcional (estado local).
- Carrito en estado local (no necesita DB todavía).
- Respetar el sistema de diseño al detalle.
- Commit.

### Paso 2 — Checkout y sistema de entregas
- Flujo de checkout completo en pasos: datos → entrega → fecha/horario → pago.
- Selector de fecha mostrando solo días habilitados (AvailableDeliveryDay).
- Selector de horario mostrando solo slots activos (DeliverySlot).
- Al confirmar, guardar el pedido en DB con estado PENDING.
- Pantalla de confirmación con botón de WhatsApp.
- Cash on delivery funcional de punta a punta.
- Commit.

### Paso 3 — Panel de administración
- `/admin` protegido por password.
- Lista de pedidos, detalle, cambio de estado.
- Edición de precios y disponibilidad de productos.
- Gestión de días y slots de entrega.
- Commit.

### Paso 4 — Mercado Pago
- Preferencia MP + redirección + webhook + páginas de retorno.
- Testear con sandbox.
- Commit.

---

## Definición de "terminado" para cada paso
- Corre con `npm run dev` sin errores en consola.
- Se ve bien en mobile (390px de ancho).
- El diseño sigue el sistema visual de Berna&co — no genérico.
- Loading y error states donde se llama a DB o API.
- Committed con mensaje claro.
