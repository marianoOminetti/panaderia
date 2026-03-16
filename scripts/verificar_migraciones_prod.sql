-- Verificación previa en PROD (opcional). Ejecutar antes de aplicar migraciones.

-- Receta_ingredientes: la nueva CHECK acepta
--   (insumo_id NOT NULL, receta_id_precursora NULL)  -> todas las filas actuales con insumo
--   (insumo_id NULL, receta_id_precursora NULL)      -> filas con solo costo_fijo
-- Ninguna fila actual tiene receta_id_precursora, así que todas cumplen.
SELECT 'receta_ingredientes: filas totales' AS check_name, COUNT(*) AS n FROM receta_ingredientes;
