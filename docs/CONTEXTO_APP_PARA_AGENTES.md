# Contexto de la app — Para agentes y desarrolladores

**Propósito:** Punto de entrada único para entender qué es esta app, cómo está organizada y dónde está cada cosa. Lectura recomendada antes de tocar código o de seguir refactors.

---

## Qué es esta app

**Panadería** es una PWA (React) para gestionar un negocio de panadería: ventas, stock de productos e insumos, recetas, clientes, plan semanal de producción, gastos fijos y analytics. Backend en **Supabase** (auth, base de datos, storage si aplica). Sin estado global (Context API): los datos se cargan en `App.js` con `useAppData` y se pasan por **props** a `AppContent` y de ahí a cada pantalla.

---

## Stack y entorno

- **Frontend:** React (Create React App), React 18.
- **Backend / BBDD:** Supabase (auth, Postgres, Realtime si se usa).
- **Despliegue:** PWA; ver [AMBIENTES.md](./AMBIENTES.md), [TROUBLESHOOTING_PROD.md](./TROUBLESHOOTING_PROD.md) si aplica.
- **Tests:** Jest + React Testing Library; un smoke test en `App.test.js`.

---

## Estructura de carpetas (src/)

```
src/
├── App.js                 # Raíz: auth, useAppData, useStockMutations, useVentas, navegación, toasts/confirm, deep links
├── components/
│   ├── AppContent.jsx     # Orquestador por tab: decide qué pantalla mostrar y le pasa las props
│   ├── analytics/         # Analytics (gráficos, semana, productos)
│   ├── auth/              # AuthScreen, ConfigMissing
│   ├── clientes/          # Clientes, ClienteDetalle, ClienteFormModal, listas y subvistas
│   ├── dashboard/         # Dashboard (métricas, alertas, accesos rápidos)
│   ├── gastos/            # GastosFijos
│   ├── insumos/           # Insumos, InsumosCompra, InsumosList, InsumosComposicion
│   ├── layout/            # AppHeader, AppNav, ErrorLogOverlay
│   ├── menu/               # MoreMenuScreen (menú "Más")
│   ├── plan/               # PlanSemanal, PlanSemanalTable, PlanSemanalActions
│   ├── recetas/            # Recetas, RecetaModal
│   ├── stock/              # Stock, StockList, StockProductionModal, StockVoiceModal
│   ├── ui/                 # Toast, ConfirmDialog, DatePicker, ProductSearchInput, SearchableSelect, etc.
│   └── ventas/             # Ventas, VentasList, VentasCart, VentasManualScreen, VentasChargeModal, modales voz
├── config/
│   ├── nav.js             # NAV_TABS (barra inferior), MORE_MENU_ITEMS (menú "Más")
│   └── appConfig.js       # Configuración de app / env
├── hooks/                  # useAppData, useAuth, useVentas, useStockMutations, useVentasCart, useInsumosCompra, ...
├── lib/                    # Lógica compartida: supabaseClient, format, costos, agrupadores, dates, voice, ...
└── utils/                  # errorReport, etc.
```

---

## Navegación y flujo de datos

- **Tabs (estado en App):** `tab` + `setTab`. Valores: `dashboard`, `ventas`, `stock`, `more`, y los del menú "Más": `analytics`, `plan`, `clientes`, `insumos`, `recetas`, `gastos`.
- **Barra inferior (AppNav):** `NAV_TABS` → Inicio (dashboard), Ventas, Stock, Más. Al elegir "Más" se muestra `MoreMenuScreen`, que con `MORE_MENU_ITEMS` permite ir a Analytics, Plan semanal, Clientes, Insumos, Recetas (y Gastos si está en ese listado).
- **Datos:** App usa `useAppData` (insumos, recetas, ventas, clientes, pedidos, stock, insumoStock, insumoMovimientos, insumoComposicion, precioHistorial, gastosFijos, etc.) y `useStockMutations` (actualizarStock, actualizarStockBatch, registrarMovimientoInsumo, consumirInsumosPorStock). Todo eso se pasa a `AppContent` y de ahí a cada pantalla según `tab`. Detalle de props: [APP_PROPS_Y_CONTEXT.md](./APP_PROPS_Y_CONTEXT.md).
- **Deep links / preloads:** App guarda estado para abrir una pantalla con contexto (ej. abrir Ventas en un grupo de deuda, abrir Stock en "cargar producción" o en manual). Esas banderas se consumen en la pantalla correspondiente y se resetean.

---

## Resumen por dominio (pantallas y hooks clave)

| Dominio | Pantalla principal | Hooks / notas |
|--------|--------------------|---------------|
| **Dashboard** | Dashboard.jsx | useDashboardAlerts; recibe datos y callbacks de navegación (onOpenCargarProduccion, onOpenGrupoDeuda, etc.). |
| **Ventas** | Ventas.jsx | useVentasCart, useVentasChargeModal, useVentas, useVentasVoz; lista (VentasList), carrito (VentasCart), venta manual (VentasManualScreen), modal cobro (VentasChargeModal). |
| **Stock** | Stock.jsx | useStockMutations, useStockCart, useStockVoz; lista, modal producción, modal voz. |
| **Insumos** | Insumos.jsx | useInsumosCompra, useInsumosLista, useInsumosComposicion; compra, lista, composición. |
| **Recetas** | Recetas.jsx | useRecetasForm, useRecetas; RecetaModal para alta/edición. |
| **Clientes** | Clientes.jsx | useClientes; ClienteDetalle (Pedidos, Ventas), ClienteFormModal. |
| **Plan semanal** | PlanSemanal.jsx | usePlanSemanalScreen, usePlanSemanal; tabla y acciones. |
| **Analytics** | Analytics.jsx | useAnalyticsData; pestañas con gráficos y proyecciones. |
| **Gastos** | GastosFijos.jsx | useGastosFijosForm, useGastosFijos. |

---

## Lib (src/lib) — Uso rápido

- **supabaseClient:** Cliente Supabase y comprobación de config (SUPABASE_CONFIG_OK).
- **format:** parseDecimal y formateo (precios, números).
- **costos:** costoDesdeIngredientes y lógica de costos de recetas.
- **agrupadores:** Agrupación de ventas/ítems (por grupo, por receta, etc.).
- **dates:** Utilidades de fechas (semana, inicio de semana, etc.).
- **units:** Conversión/unidades de insumos.
- **metrics / stockMetrics / stockPlan:** Métricas y plan de stock.
- **voice / voiceInsumos:** Reconocimiento de voz (ventas, insumos).
- **offlineVentas:** Persistencia de ventas pendientes offline.
- **pushNotifications / notifyEvent:** Push y eventos de notificaciones.
- **contacts:** Integración con contactos (si se usa).

---

## Documentación relacionada (índice)

| Documento | Para qué sirve |
|-----------|-----------------|
| [PLAN_COMENTARIOS_APP.md](./PLAN_COMENTARIOS_APP.md) | Plan para comentar la app (cabeceras, secciones, orden por fases). |
| [CONVENCION_COMENTARIOS.md](./CONVENCION_COMENTARIOS.md) | Formato y reglas de qué comentar en archivos (hooks, componentes, lib). |
| [APP_PROPS_Y_CONTEXT.md](./APP_PROPS_Y_CONTEXT.md) | Props App → AppContent y posible evolución a Context. |
| [CON_QUE_SEGUIR.md](./CON_QUE_SEGUIR.md) | Próximos pasos de refactor (Ventas, Insumos, etc.). |
| [ESTADO_REFACTOR_DEV_LEAD.md](./ESTADO_REFACTOR_DEV_LEAD.md) | Estado del refactor por fases y archivos grandes. |
| [ARCHIVOS_POR_BLOQUE_REFACTOR.md](./ARCHIVOS_POR_BLOQUE_REFACTOR.md) | Archivos por dominio y candidatos a refactor. |
| **RESUMEN_BLOQUE_*.md** | Detalle de lo hecho en cada bloque (E Ventas, B Insumos, D Dashboard, F Analytics, G Stock, H Plan, K Gastos, etc.). |

---

## Convención de comentarios en código

Al tocar un archivo, aplicar [CONVENCION_COMENTARIOS.md](./CONVENCION_COMENTARIOS.md): cabecera con propósito, quién lo usa y contrato (params/return o props); secciones largas con `// --- Nombre ---`; comentar reglas de negocio no obvias. El plan detallado está en [PLAN_COMENTARIOS_APP.md](./PLAN_COMENTARIOS_APP.md).
