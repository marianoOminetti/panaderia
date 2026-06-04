# Configuración AFIP (registrar-en-afip)

## Proveedores soportados

| `AFIP_PROVIDER` | Qué necesitás |
|-----------------|---------------|
| *(vacío)* + `AFIP_ALLOW_MOCK=true` | Pruebas sin ARCA |
| **`wsfe`** | **Directo AFIP** — certificado + clave privada desde ARCA → ver **[AFIP_ARCA_DIRECTO.md](./AFIP_ARCA_DIRECTO.md)** |
| `tusfacturas` | API key del proveedor (no ARCA) |

## Proyecto Supabase

**Principal:** `xdiggsdjmmylkvephyod` → `https://xdiggsdjmmylkvephyod.supabase.co`

## Deploy

```bash
npm run db:push
npm run functions:deploy:afip
```

No uses `#` en la misma línea de `supabase secrets set`.

## UI

- Cobro: checkbox **Registrar en AFIP**
- Lista ventas: **📄** factura fiscal · **AFIP** si falta registro
- Comprobante WhatsApp (📤): sin cambios
