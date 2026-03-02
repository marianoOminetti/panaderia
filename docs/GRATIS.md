# Opción 100% gratis: PWA instalable

Sin pagar Apple ni Google, podés tener la app instalada en iOS y Android como si fuera nativa.

---

## ¿Qué es una PWA?

Una **Progressive Web App** se instala desde el navegador con "Agregar a pantalla de inicio". Se abre en pantalla completa, sin barra del navegador, y aparece como una app más en el celular.

**Panadería SG ya está preparada** como PWA (manifest, íconos, meta tags), con **HTTPS** obligatorio en el hosting y **política de privacidad** en `/privacidad.html`.

---

## Pasos (todo gratis)

### 1. Subir la app a internet (hosting gratis)

Elegí uno de estos:

| Servicio | Límite gratis | Deploy |
|----------|---------------|--------|
| **Vercel** | 100 GB/mes | Conectás GitHub, build automático |
| **Netlify** | 100 GB/mes | Igual |
| **GitHub Pages** | 1 GB | `npm run build` → subís carpeta `build/` |
| **Cloudflare Pages** | Ilimitado | Conectás repo |

**Ejemplo con Vercel:**
1. Creá cuenta en [vercel.com](https://vercel.com)
2. "Import Project" → conectá tu repo de GitHub
3. Build command: `npm run build`
4. Output directory: `build`
5. Agregá las variables de entorno (Supabase URL y Key)
6. Deploy

Te dan una URL tipo: `https://panaderia-xxx.vercel.app`

### 2. Instalar en Android

1. Abrí **Chrome** en el celular
2. Entrá a tu URL (ej: `https://panaderia-xxx.vercel.app`)
3. Menú (⋮) → **"Agregar a la pantalla de inicio"** o **"Instalar app"**
4. Confirmá

La app queda en el drawer de apps como cualquier otra.

### 3. Instalar en iPhone

1. Abrí **Safari** (no Chrome; en iOS el install solo funciona en Safari)
2. Entrá a tu URL
3. Tocá el botón **Compartir** (cuadrado con flecha)
4. **"Agregar a pantalla de inicio"**
5. Confirmá

La app queda en el home como un ícono más.

---

## Limitaciones vs app nativa

| Aspecto | PWA | App de tienda |
|---------|-----|----------------|
| Costo | $0 | Apple $99/año, Google $25 |
| Instalación | Desde el navegador | Desde App Store / Play Store |
| Notificaciones push | Limitadas en iOS | Completas |
| Offline | Parcial (requiere service worker) | Depende de la app |
| Contact Picker | Chrome Android ✅, Safari ❌ | ✅ |
| Reconocimiento de voz | ✅ | ✅ |

Para una panadería que registra ventas y stock, la PWA suele alcanzar.

---

## Resumen

1. **Build**: `npm run build`
2. **Hosting**: Vercel / Netlify / GitHub Pages (gratis)
3. **Android**: Chrome → menú → "Agregar a pantalla de inicio"
4. **iPhone**: Safari → Compartir → "Agregar a pantalla de inicio"

**Costo total: $0**
