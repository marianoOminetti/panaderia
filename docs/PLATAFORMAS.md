# Publicación en iOS y Android

Guía para llevar Panadería SG a App Store (iOS) y Google Play (Android).

> **¿Querés hacerlo gratis?** Mirá [docs/GRATIS.md](GRATIS.md) — PWA instalable sin pagar tiendas.

---

## 1. Ambientes (dev, staging, prod)

### Estructura de archivos

| Archivo | Uso | Cuándo se carga |
|---------|-----|-----------------|
| `.env.development.local` | Desarrollo local | `npm start` |
| `.env.staging` | Staging / pruebas | `npm run build:staging` |
| `.env.production.local` | Producción | `npm run build` |

### Configuración

1. **Desarrollo**: Copiá `.env.development.example` → `.env.development.local` y completá con tu proyecto Supabase de desarrollo.

2. **Staging**: Copiá `.env.staging.example` → `.env.staging` y completá con tu proyecto Supabase de staging (o el mismo que prod para pruebas).

3. **Producción**: Copiá `.env.production.example` → `.env.production.local` y completá con tu proyecto Supabase de producción.

### Proyectos Supabase recomendados

- **dev**: Para desarrollo, con datos de prueba.
- **staging**: Opcional, para probar antes de prod.
- **prod**: Datos reales del negocio.

Creá cada proyecto en [supabase.com](https://supabase.com) y ejecutá las migraciones en cada uno.

### Scripts

```bash
npm start              # Dev (usa .env.development.local)
npm run build          # Prod (usa .env.production.local)
npm run build:staging  # Staging (usa .env.staging)
```

---

## 2. Preparación para móvil (Capacitor)

### Instalación

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Panadería SG" "com.panaderiasg.app"
```

### Configuración

En `capacitor.config.ts` (o `.json`):

```json
{
  "appId": "com.panaderiasg.app",
  "appName": "Panadería SG",
  "webDir": "build",
  "server": {
    "androidScheme": "https"
  }
}
```

### Build y sync

```bash
# Producción
npm run build
npx cap sync

# iOS
npx cap open ios

# Android
npx cap open android
```

### Permisos (Contact Picker)

**iOS** – En `ios/App/App/Info.plist`:

```xml
<key>NSContactsUsageDescription</key>
<string>Para agregar clientes desde tu lista de contactos al registrar ventas.</string>
```

**Android** – El Contact Picker API web no requiere permiso nativo. Si usás acceso nativo a contactos, agregá en `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

---

## 3. Google Play (Android)

### Requisitos

- Cuenta de [Google Play Console](https://play.google.com/console) (pago único ~USD 25)
- Keystore para firmar la app

### Crear keystore

```bash
keytool -genkey -v -keystore panaderia-release.keystore -alias panaderia -keyalg RSA -keysize 2048 -validity 10000
```

Guardá el keystore y las contraseñas en un lugar seguro.

### Generar AAB (Android App Bundle)

1. Abrí el proyecto en Android Studio: `npx cap open android`
2. `Build` → `Generate Signed Bundle / APK` → `Android App Bundle`
3. Seleccioná el keystore y completá alias y contraseñas
4. Elegí `release` y generá el AAB

### Subir a Play Console

1. Creá la app en Play Console
2. Completá la ficha de la tienda (descripción, capturas, íconos)
3. Subí el AAB en `Producción` o `Prueba interna`
4. Enlazá la política de privacidad: `https://tudominio.com/privacidad.html`
5. Declará permisos si usás contactos
6. Enviá a revisión

### Checklist Android

- [ ] Política de privacidad publicada y enlazada
- [ ] Íconos 512x512 y capturas de pantalla
- [ ] Descripción y categoría correctas
- [ ] AAB firmado correctamente

---

## 4. App Store (iOS)

### Requisitos

- Mac con Xcode
- [Apple Developer Program](https://developer.apple.com/programs/) (USD 99/año)
- Certificados y provisioning profiles

### Configuración en Xcode

1. Abrí: `npx cap open ios`
2. Seleccioná el target `App`
3. En `Signing & Capabilities`, elegí tu Team y habilitá `Automatically manage signing`
4. Verificá que el Bundle ID coincida con `appId` de Capacitor

### Generar IPA

1. Seleccioná dispositivo genérico: `Any iOS Device (arm64)`
2. `Product` → `Archive`
3. En Organizer: `Distribute App` → `App Store Connect` → `Upload`

### En App Store Connect

1. Creá la app en [App Store Connect](https://appstoreconnect.apple.com)
2. Completá metadata, capturas, descripción
3. Enlazá la política de privacidad
4. Agregá `NSContactsUsageDescription` si usás contactos
5. Enviá a revisión

### Checklist iOS

- [ ] Política de privacidad enlazada
- [ ] Capturas para todos los tamaños de iPhone
- [ ] Descripción y categoría
- [ ] Certificados y provisioning correctos

---

## 5. Hosting web (para PWA y links)

Para que la app funcione como PWA y los links de privacidad funcionen:

1. **Vercel / Netlify / Firebase Hosting**: Conectá el repo y configurá el build con `npm run build`. El output es la carpeta `build/`.

2. **URL de producción**: Usá HTTPS. Ejemplo: `https://app.panaderiasg.com`

3. **Actualizar `manifest.json`**: Si cambia el dominio, actualizá `start_url` y la URL de privacidad.

---

## 6. Resumen de costos

| Item | Costo |
|------|-------|
| Google Play (una vez) | ~USD 25 |
| Apple Developer (anual) | USD 99/año |
| Supabase | Gratis hasta cierto uso |
| Hosting (Vercel/Netlify) | Gratis en planes básicos |

---

## 7. Orden sugerido

1. Configurar ambientes y probar builds
2. Crear proyectos Supabase (dev, prod)
3. Instalar y configurar Capacitor
4. Probar en dispositivo físico (Android e iOS)
5. Publicar en Google Play primero (más simple)
6. Publicar en App Store
