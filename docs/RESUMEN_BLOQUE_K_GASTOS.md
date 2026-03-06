# Resumen: Bloque K — Gastos

**Plan:** [PLAN_EJECUCION_POR_IMPACTO.md](./PLAN_EJECUCION_POR_IMPACTO.md)

---

## Hecho

- **useGastosFijosForm.js:** estado modal, editando, form, saving; handlers openNew, openEdit, save, closeModal. Recibe showToast y saveGastoFijo desde el componente.
- **GastosFijos.jsx:** usa useGastosFijosMutations (toggle, delete, saveGastoFijo) y useGastosFijosForm; mantiene calcularGastosFijosNormalizados (exportado), toggleActivo, eliminar, lista y modal JSX. Cabecera con comentario.
- Build: OK.

## Archivos

| Archivo | Acción |
|---------|--------|
| src/hooks/useGastosFijosForm.js | Creado |
| src/components/gastos/GastosFijos.jsx | Modificado |
