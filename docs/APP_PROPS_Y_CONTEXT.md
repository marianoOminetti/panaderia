# App — Props y posible Context (Bloque M)

**Objetivo:** Documentar qué recibe AppContent desde App para que, si el árbol crece o el drilling molesta, se pueda valorar un Context por dominio.

---

## Estado y callbacks que App pasa a AppContent

- **Navegación:** `tab`, `setTab`
- **Toasts y confirm:** `showToast`, `confirm`
- **Preloads / deep links:** `stockProductionPreloadReceta`, `setStockProductionPreloadReceta`, `ventasPreloadGrupoKey`, `onConsumedVentasPreload`, `ventasNuevaFlag`, `onConsumedVentasNueva`, `stockOpenManual`, `onConsumedStockOpenManual`
- **Datos (useAppData):** `insumos`, `recetas`, `ventas`, `recetaIngredientes`, `clientes`, `pedidos`, `stock`, `insumoStock`, `insumoMovimientos`, `insumoComposicion`, `precioHistorial`, `gastosFijos`, `loading`, `loadData`, `setStock`, `setInsumoStock`, `setInsumoMovimientos`, `recetasFilterIds`, `setRecetasFilterIds`, `planSemanalVersion`, `setPlanSemanalVersion`
- **Stock:** `actualizarStock`, `actualizarStockBatch`, `registrarMovimientoInsumo`, `consumirInsumosPorStock`
- **Otros:** `session` (auth), `onRefresh` (wrapper de loadData)

---

## Posible evolución (no implementado)

Si en el futuro se quiere reducir props o compartir estado sin pasar por muchos niveles:

- **ToastContext / ConfirmContext:** `showToast` y `confirm` usados en muchas pantallas; un Context permitiría consumirlos sin pasarlos desde App.
- **AuthContext:** `session` (y quizá `signIn`/`signOut`) ya se usan en varios sitios; opcional centralizar.
- **Datos (AppDataContext):** los datos de useAppData y loadData podrían vivir en un Provider; hoy se concentran en App y se bajan por props, lo cual está bien mientras la lista de props sea manejable.

No se ha cambiado código en App.js en este bloque; solo documentación para continuidad.
