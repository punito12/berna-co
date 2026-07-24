# Puntos potenciales de venta

Módulo interno para descubrir y evaluar comercios físicos que podrían revender
productos Berna&Co. No busca contactos y no guarda teléfonos, emails, redes,
personas ni datos de outreach.

## Arquitectura

- `ProspectZone`: polígono comercial, tipo de área, Tier A/B/C/Excluded,
  densidad, radio, límite y catálogo de búsquedas.
- `ProspectScan` + `ProspectScanCell`: cola persistida. Cada celda representa un
  punto de grilla y una consulta; su clave estable hace idempotente el reintento.
- `ProspectStore`: ficha evaluable separada de `Customer`.
- `ProspectSource`: conserva todas las referencias a Google u otros proveedores.
- `ProspectDuplicateCandidate`: coincidencias inciertas para revisión manual.
- `ProspectScoringConfig`: reglas determinísticas editables con fallback seguro.
- Worker: `scripts/prospect-worker.ts` en local y Vercel Cron en producción.

La grilla es hexagonal, mantiene los centros dentro del polígono y combina cada
punto con consultas configurables. Discovery usa Text Search IDs-only para
todos los modos: Nearby Search no tiene un SKU IDs-only y pedir incluso el ID
activa Nearby Search Pro. Google puede ordenar o truncar resultados: el
porcentaje indica trabajo ejecutado, no una garantía matemática de descubrir
todos los comercios.

## Variables de entorno

```dotenv
GOOGLE_PLACES_API_KEY="..."
CRON_SECRET="una-cadena-aleatoria-de-al-menos-16-caracteres"
```

`GOOGLE_PLACES_API_KEY` se usa solo en el servidor. `CRON_SECRET` protege
`/api/cron/prospect-scans`; Vercel lo envía como `Authorization: Bearer ...`.

## Google Cloud

1. Crear o elegir un proyecto con billing habilitado.
2. Habilitar **Places API (New)**.
3. Crear una credencial exclusiva para este servidor y restringirla a Places
   API (New). Si la infraestructura tiene egreso fijo, agregar restricción por
   IP; Vercel normalmente usa IP dinámica, por lo que una salida fija/proxy u
   OAuth server-to-server mejora esa restricción.
4. Configurar cuotas y alertas de presupuesto en Google Cloud.
5. Cargar la clave como secret en `.env.local` y Vercel, nunca como
   `NEXT_PUBLIC_*`.

Referencias oficiales:

- [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Place Types (New)](https://developers.google.com/maps/documentation/places/web-service/place-types)
- [Uso y billing de Places](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Seguridad de claves](https://developers.google.com/maps/api-security-best-practices)

## Dos etapas y field masks

### 1. Discovery

Cada celda hace:

1. Text Search Essentials (IDs Only) con `places.id`.
2. Deduplicación de IDs dentro de la respuesta y contra `ProspectSource` /
   `ProspectStore`.
3. Place Details Pro únicamente para IDs nuevos, con:
   `id,displayName,formattedAddress,location,types,primaryType,businessStatus,googleMapsUri`.

Los fields Pro que determinan el SKU son `displayName`, `primaryType`,
`businessStatus` y `googleMapsUri`. `formattedAddress`, `location` y `types`
son Essentials en Place Details, pero no elevan el SKU por encima de Pro.

Discovery nunca solicita `rating`, `userRatingCount`, `reviews`, horarios,
teléfonos, `websiteUri`, `priceLevel`, contactos ni fields Atmosphere.

### 2. Enrichment opcional

El operador selecciona manualmente hasta ocho prospectos y pulsa **Estimar
enrichment**. Recién después de ver el costo y confirmar, Place Details pide:
`id,rating,userRatingCount`. Rating y cantidad de reseñas disparan Place
Details Enterprise; no se solicitan textos de reviews ni Atmosphere.

## Puesta en marcha local

```bash
npm install
npm run db:whoami
node --env-file=.env.local ./node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.local ./node_modules/prisma/build/index.js generate
npm run dev
```

Entrar en `/admin/potenciales`. La migración crea un ejemplo editable llamado
`Nordelta (ejemplo editable)` con los scans deshabilitados. El contorno es
ilustrativo y debe revisarse antes de habilitarlo.

## Ejecutar un scan chico

1. Abrir **Puntos potenciales → Zonas y scans**.
2. Revisar/ajustar el polígono de ejemplo.
3. Mantener 400–600 m de separación y un radio solapado.
4. Seleccionar pocas consultas (por ejemplo tipos Google, minimercado,
   dietética, congelados y gourmet).
5. Habilitar scans, guardar y pulsar **Estimar scan**.
6. Revisar requests teóricos y limitados, máximo de IDs únicos, desglose por
   SKU, free tier asumido y costos antes/después del free tier.
7. Pulsar **Iniciar scan** y confirmar.
8. Procesar uno o más lotes localmente:

```bash
npm run prospects:worker -- 10
```

El número final limita los lotes, no requests. Cada lote procesa una celda y
respeta el límite total del scan. El tamaño conservador permite completar
timeouts y reintentos dentro de los 60 segundos disponibles para el cron.

No hay credenciales Google en el repositorio y no se ejecutó ningún scan pago
durante la implementación.

## Producción y Vercel Cron

`vercel.json` invoca el worker cada cinco minutos. Esa frecuencia requiere
Vercel Pro o Enterprise; Hobby solo admite una ejecución diaria. En Hobby:

- cambiar temporalmente la expresión a una diaria, o
- ejecutar el worker CLI desde un proceso externo seguro, o
- subir de plan antes de desplegar la expresión de cinco minutos.

Vercel no garantiza ejecución exacta. La cola tolera invocaciones tardías,
locks vencidos y reintentos; no depende de que un request admin quede abierto.

Referencia: [Vercel Cron: uso y frecuencia](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Scoring

Default sobre 100:

- Encaje comercial: A 55, B 40, C 20, Excluded 0/oculto.
- Compatibilidad: 30 alta, 24 buena, 18 general, 8 incierta.
- Señales premium observables: hasta 6.
- Barrio cerrado o centro comercial seleccionado: 4.
- Actividad: operativo 2 y reseñas hasta 3.

Todas las partes se muestran en la ficha. Las reglas, términos, categorías y
costos unitarios estimados se editan en **Configuración**. Un score manual exige
motivo y nunca borra el desglose calculado.

## Controles de costo y confiabilidad

- Inicio explícito, nunca automático.
- Preview de puntos × consultas.
- Límite por scan y máximo de 20 resultados por request.
- Text Search IDs-only seguido de deduplicación.
- Place Details Pro solo para IDs nuevos.
- Rating y cantidad de reseñas solo mediante enrichment manual Enterprise.
- Contador persistido antes de llamar al proveedor.
- Celdas idempotentes y fuentes con fingerprint único.
- Tres intentos con backoff, timeout de 12 segundos y fallas visibles.
- Pausa, reanudación, cancelación y retry de celdas fallidas.
- Locks con vencimiento para evitar dos workers sobre el mismo scan.

El estimador resuelve el SKU desde el endpoint y el field mask exactos. Usa la
tabla global de precios por volumen publicada por Google el 20/07/2026. En
**Configuración** se carga únicamente el consumo mensual previo asumido por
SKU; las tarifas y fields no se editan manualmente.

La vista muestra:

- requests teóricos y limitados;
- máximo de Place Details antes de conocer la deduplicación real;
- requests y billables estimados por SKU;
- free usage cap, uso mensual asumido y saldo libre;
- costo máximo antes del free tier y estimado después;
- field mask exacto y fields que determinan cada SKU;
- advertencia visible para cualquier field Enterprise.

La estimación de Details es un máximo conservador: supone que todos los IDs
devueltos son distintos. La ejecución real deduplica antes de pedir detalles y
puede costar menos.

## Green Life

Existe un adaptador aislado, pero está deshabilitado. La inspección del sitio
actual mostró páginas HTML con miles de entradas y categorías incompatibles,
sin una API geográfica pública estable ni coordenadas estructuradas. Automatizar
ese HTML sería frágil y obligaría a geocodificar agresivamente.

Se puede activar cuando exista un feed autorizado y estable con nombre,
categoría, dirección, latitud, longitud y URL de origen. El resto del módulo no
depende de su estructura.

## Límites conocidos

- `Customer` no guarda dirección comercial; la coincidencia automática con
  clientes existentes se limita al nombre normalizado y siempre es revisable.
- PostgreSQL no tiene índices espaciales/PostGIS en este proyecto; la búsqueda
  por proximidad usa un bounding box pequeño y Haversine en memoria.
- El mapa usa tiles de OpenStreetMap y Leaflet existentes; Google solo actúa
  como fuente server-side de Places.
- La cobertura depende del ranking y límites del proveedor.
- El cron de cinco minutos requiere Vercel Pro/Enterprise.
