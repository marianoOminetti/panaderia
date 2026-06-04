# Configuración AFIP (registrar-en-afip)

## Proveedores soportados

| `AFIP_PROVIDER` | Qué necesitás |
|-----------------|---------------|
| *(vacío)* + `AFIP_ALLOW_MOCK=true` | Pruebas sin ARCA |
| **`wsfe`** | **Directo AFIP** — certificado + clave privada desde ARCA → ver **[AFIP_ARCA_DIRECTO.md](./AFIP_ARCA_DIRECTO.md)** |
| `tusfacturas` | API key del proveedor (no ARCA) |

## Proyectos Supabase

| Ambiente | Project ref | Comandos típicos |
|----------|-------------|------------------|
| **Staging** (`develop`) | `xdiggsdjmmylkvephyod` | `npm run db:push:dev`, `npm run functions:deploy:afip`, `npm run afip:setup:local` |
| **Producción** (`master`) | `clgxrxlccjjqxzvapfav` | `npm run db:push:prod`, deploy función en prod, `npm run afip:setup:prod` |

## Modo mock (local / staging sin ARCA)

En el proyecto **dev** (`xdiggsdjmmylkvephyod`):

```bash
npm run secrets:set:afip-mock
supabase secrets set AFIP_PRODUCTION=false --project-ref xdiggsdjmmylkvephyod
npm run functions:deploy:afip
```

Con `AFIP_ALLOW_MOCK=true` y **sin** `AFIP_PRODUCTION=true`, la edge usa mock aunque existan certificados WSFE. El comprobante queda `estado=mock` (banner «prueba»); el QR AFIP real no aplica en mock.

`npm start` debe apuntar al mismo proyecto (`.env.development.local` → dev). Usuario **admin** para facturar.

## Deploy (staging)

```bash
npm run db:push:dev
npm run functions:deploy:afip
npm run afip:setup:local   # homologación (default)
```

## Deploy (producción, después del merge a master)

```bash
npm run db:push:prod
supabase link --project-ref clgxrxlccjjqxzvapfav
supabase functions deploy registrar-en-afip
npm run afip:setup:prod
supabase secrets unset AFIP_ALLOW_MOCK   # si existiera
```

No uses `#` en la misma línea de `supabase secrets set`.

## UI

- Cobro: checkbox **Registrar en AFIP**
- Lista ventas: **📄** factura fiscal · **AFIP** si falta registro
- Comprobante WhatsApp (📤): sin cambios
