# Facturación directa AFIP (sin TusFacturas)

En ARCA **no hay una “API key”**. Para ir directo a los Web Services necesitás un **certificado digital** + **clave privada** (archivos que generás vos) y autorizar el servicio **WSFE** en tu CUIT.

La Edge Function usa `AFIP_PROVIDER=wsfe` y el SDK `@ramiidv/arca-facturacion` para hablar con AFIP (WSAA + WSFE) **solo con tu certificado** — no hace falta cuenta en AfipSDK ni `access_token` de terceros.

---

## Qué sacar de ARCA (paso a paso)

### 1. Clave fiscal (nivel 3)

No es la “key” de la app. Solo sirve para entrar a ARCA y tramitar el certificado.

### 2. Punto de venta (importante: tipo Web Services)

En ARCA podés tener un PV **00001** modo **«Factura en línea – Monotributo»** (facturás desde la web de AFIP). Eso **no sirve** para esta app: la Edge Function usa el Web Service **WSFE** y AFIP devuelve error **11002** o lista vacía en `FEParamGetPtosVenta`.

Necesitás **otro** punto de venta (o uno nuevo si solo tenés el de “en línea”):

1. ARCA → **Administración de puntos de venta y domicilios** (o Comprobantes en línea → ABM Puntos de ventas).
2. **Alta de punto de venta** → sistema / emisión: **«Factura electrónica – Web Services»** (monotributo).  
   No uses «Comprobantes en línea» ni «Factura en línea».
3. Anotá el **número** (puede ser `2`, `3`, etc.; el tipo **no se puede cambiar** después).
4. Ese número va en `AFIP_PUNTO_VENTA` y en `npm run afip:setup:local`.

Verificar desde tu Mac (con cert en `.afip-local/`):

```bash
AFIP_PRODUCTION=true npm run afip:listar-pv
```

Debe listar al menos un PV. Si dice “Sin resultados”, todavía no hay ninguno tipo Web Services.

### 3. Certificado digital + clave privada (esto reemplaza la “API key”)

#### A) Generar clave privada y pedido CSR (en tu Mac)

```bash
cd ~/Desktop
openssl genrsa -out afip-privada.key 2048
openssl req -new -key afip-privada.key -subj "/C=AR/O=TuNegocio/CN=TuNegocio/serialNumber=CUIT 20123456789" -out afip-pedido.csr
```

Reemplazá `20123456789` por tu **CUIT sin guiones**.

#### B) En ARCA

1. **Administrador de Relaciones de Clave Fiscal** → agregar relación con el servicio **“Administración de Certificados Digitales”**.
2. Entrar a **Administración de Certificados Digitales**.
3. **Nuevo certificado** → alias (ej. `panaderia-app`) → subir el archivo **`afip-pedido.csr`**.
4. Descargar el **certificado** (`.crt`).

#### C) Autorizar el Web Service de facturación

En **Administrador de Relaciones**:

- Relacionar tu certificado (alias) con el Web Service **“Facturación Electrónica”** / **WSFE** (nombre puede variar según pantalla ARCA).
- CUIT representada = la del negocio.

Sin este paso, el certificado existe pero AFIP rechaza las facturas.

### 4. Homologación vs producción

- Primero probá con `AFIP_PRODUCTION=false` (entorno de homologación AFIP).
- Cuando el contador dé OK → `AFIP_PRODUCTION=true`.

---

## Configuración en Supabase (no hay pantallas en el dashboard)

AFIP **no** se configura en Table Editor ni en Settings visibles. Solo:

1. **Secrets** de Edge Functions (CLI o Dashboard → Project Settings → Edge Functions → Secrets)
2. **Función** `registrar-en-afip` desplegada

En este proyecto ya se cargó con:

```bash
npm run afip:setup:local
# Producción ARCA (certificado real):
AFIP_PRODUCTION=true npm run afip:setup:local
```

Ver secrets: `supabase secrets list` (solo nombres, no valores).

## Cómo cargar cert + key en Supabase

**No pegues certificados ni claves en el chat** (Cursor, WhatsApp, etc.). Usá el script local:

```bash
cd /Users/mariano/panaderia
npm run afip:setup
```

Te pide: CUIT, punto de venta, rutas a `.crt` y `.key`, homologación o producción. Sube los secrets y despliega la función.

**Guardá `afip-privada.key` en lugar seguro** (caja de contraseñas). No la subas a Git.

---

## Secrets resumen

| Secret | Ejemplo |
|--------|---------|
| `AFIP_PROVIDER` | `wsfe` |
| `AFIP_CUIT` | CUIT solo números |
| `AFIP_PUNTO_VENTA` | `1` |
| `AFIP_PRODUCTION` | `false` luego `true` |
| `AFIP_CERT_B64` | certificado .crt en base64 |
| `AFIP_KEY_B64` | clave privada .key en base64 |

---

## Qué NO es

| Concepto | Uso |
|----------|-----|
| Clave fiscal web | Login ARCA |
| CAE | Lo devuelve AFIP al facturar |
| TusFacturas API key | Solo si usás proveedor (`AFIP_PROVIDER=tusfacturas`) |

---

## Probar

1. Venta con checkbox **Registrar en AFIP**.
2. En Supabase → `facturas_electronicas` debe quedar `estado = autorizada` y CAE numérico (no `MOCK`).
3. En la lista de ventas → **📄** para compartir comprobante.

Si falla, ver logs: Dashboard → Edge Functions → `registrar-en-afip` → Logs.

**Importante:** en Invocations un **HTTP 200** solo significa que la función respondió. El cuerpo puede ser `{ ok: false, error: "..." }`. Revisá también la tabla `facturas_electronicas.error_mensaje`.

### Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| `access_token` / 401 | Función vieja con `@afipsdk/afip.js`. Redesplegá `registrar-en-afip`. |
| `WSAA login falló` / HTTP 500 / `NoSOAPAction` | Certificado sin relación **WSFE**, `AFIP_PRODUCTION` incorrecto, o función sin el parche SOAPAction (redesplegá). |
| `punto de venta no se encuentra habilitado` (11002) | El PV es tipo **Factura en línea** y no **Web Services**. Creá un PV nuevo WSFE y actualizá `AFIP_PUNTO_VENTA`. `npm run afip:listar-pv` debe mostrarlo. |
| `10000` + **domicilio fiscal** | Trámite en ARCA/AFIP (DFE, domicilio completo, formulario F183). No es bug de la app; cuando AFIP lo libere, reintentá **AFIP** en la misma venta. |
| `401` en `error_mensaje` | Intentos viejos (librería anterior). Reintentá; el último error debería ser otro si la función está actualizada. |
| Rechazo con observaciones | Importes, condición IVA del receptor, etc. |

**No hace falta regenerar certificado** si cert y key siguen siendo pareja; lo habitual es corregir **punto de venta** o la relación WSFE en ARCA.

Después de cambiar secrets o código:

```bash
supabase functions deploy registrar-en-afip --project-ref xdiggsdjmmylkvephyod
```
