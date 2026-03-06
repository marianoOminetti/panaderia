# Resumen: Bloque G — Stock

**Plan:** [PLAN_EJECUCION_POR_IMPACTO.md](./PLAN_EJECUCION_POR_IMPACTO.md)

---

## Hecho

- **useStockCart.js:** estado stockCart, setStockCart, addToStockCart, totalCartUnidades. Usado por Stock.jsx.
- **useStockVoz.js:** estado y handlers del modal de voz (voiceModal, listening, transcript, parsedStock, savingVoice, iniciarVozStock, detenerRecStock, iniciarRecStock, cargarStockVoz, onBack, onCancelar). Recibe ejecutarCargaVoz desde Stock para no duplicar lógica.
- **Stock.jsx:** usa useStockCart y useStockVoz; mantiene ejecutarCargaVoz, cargarStockCarrito, manualScreenOpen, manualSaving, efectos de preload y stockOpenManual. Cabecera con comentario de contexto.
- Build: OK.

## Archivos

| Archivo | Acción |
|---------|--------|
| src/hooks/useStockCart.js | Creado |
| src/hooks/useStockVoz.js | Creado |
| src/components/stock/Stock.jsx | Modificado (orquestación + hooks) |
