# Compliance para publicación en Google Play / App Store

## Checklist previo a publicación

### Google Play
- [ ] Política de privacidad publicada y enlazada (ej: `/privacidad.html`)
- [ ] Declarar permisos en el manifest si se usa como PWA/TWA
- [ ] Si se usa Contact Picker API: declarar en la descripción de la app
- [ ] Probar en dispositivos Android reales

### App Store (iOS)
- [ ] Política de privacidad enlazada
- [ ] Si se usa Capacitor/nativo con contactos: `NSContactsUsageDescription` en Info.plist
- [ ] Probar en dispositivos iOS reales

### Permisos utilizados

| Permiso | Uso | Cuándo se pide |
|---------|-----|----------------|
| Contactos | Elegir cliente desde la agenda del celular | Solo al tocar el botón 📇 "Elegir de contactos" |

### Contact Picker API (Web)
- **Soporte**: Chrome en Android, requiere HTTPS
- **Comportamiento**: El usuario elige explícitamente qué contacto compartir; no hay acceso a toda la agenda
- **Fallback**: Si no está disponible, se muestra mensaje y se usa entrada manual

### Archivos de compliance
- `public/privacidad.html` - Política de privacidad
- `public/manifest.json` - Metadata PWA
- `public/index.html` - Meta tags para iOS

### Si se empaqueta con Capacitor
Agregar en `ios/App/App/Info.plist`:
```xml
<key>NSContactsUsageDescription</key>
<string>Para agregar clientes desde tu lista de contactos al registrar ventas.</string>
```

En `android/app/src/main/AndroidManifest.xml` (si se accede a contactos de forma nativa):
```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
```
