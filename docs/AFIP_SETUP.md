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
| **Producción** (`master`) | `clgxrxlccjjqxzvapfav` | `npm run db:push:prod`, deploy función en prod, `AFIP_PRODUCTION=true npm run afip:setup:local` |

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
AFIP_PRODUCTION=true npm run afip:setup:local
supabase secrets unset AFIP_ALLOW_MOCK   # si existiera
```

No uses `#` en la misma línea de `supabase secrets set`.

## UI

- Cobro: checkbox **Registrar en AFIP**
- Lista ventas: **📄** factura fiscal · **AFIP** si falta registro
- Comprobante WhatsApp (📤): sin cambios
