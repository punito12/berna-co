# Uploads con Vercel Blob

Phase 2 cambia solo los uploads nuevos del admin. No migra imagenes existentes
ni borra archivos de `public/images`.

## Comportamiento

- Productos: `app/api/admin/products/upload/route.ts` sube a Blob con prefijo
  `productos/`.
- CMS general: `app/api/admin/cms/upload/route.ts` sube a Blob con prefijo
  `cms/`.
- Branding/logo: el mismo endpoint CMS, cuando recibe `folder=branding`, sube
  con prefijo `branding/`.
- La respuesta sigue siendo compatible: `{ "url": "https://..." }`.
- Los valores antiguos que empiezan con `/images/...` siguen funcionando porque
  los archivos locales no se mueven ni se eliminan.
- Los componentes usan `img src`, por lo que aceptan tanto `/images/...` como
  URLs absolutas `https://...`.

## Variable de entorno requerida

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

- Local: requerida si se prueban uploads contra Blob desde `npm run dev`.
- Staging: requerida.
- Produccion: requerida.

Si falta, los endpoints responden con error 503 y un mensaje claro para el
admin. El resto del sitio puede seguir mostrando imagenes existentes.

## Compatibilidad

No cambiar manualmente las URLs existentes antes de la migracion de imagenes.
La migracion futura debe inventariar y reemplazar de forma controlada:

- `Product.imageUrl`
- JSON `Product.images`
- `SiteImage.url`
- `SiteImage.urlDraft`
- `SiteContent.logoUrl`
- `SiteContent.logoUrlDraft`
- `SiteSection.config` / `configDraft` con `imageUrl`

## Pruebas manuales

1. Configurar `BLOB_READ_WRITE_TOKEN`.
2. Iniciar sesion en `/admin`.
3. Subir imagen de producto.
4. Confirmar que la respuesta contiene una URL `https://`.
5. Guardar producto y revisar admin + catalogo publico.
6. Subir imagen CMS de hero.
7. Ver preview y publicar.
8. Subir logo desde identidad.
9. Confirmar que una imagen vieja `/images/...` todavia renderiza.
