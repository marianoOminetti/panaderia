-- Promos duplicadas por doble guardado optimista (mismo nombre/tipo/descuento).
-- Ejecutar en Supabase SQL Editor (prod) o vía scripts/limpiar_promos_duplicadas_prod.js

-- 1) Inspeccionar recientes
SELECT
  p.id,
  p.nombre,
  p.tipo,
  p.descuento_fijo,
  p.activa,
  p.created_at,
  COUNT(pr.receta_id) AS productos
FROM promociones p
LEFT JOIN promocion_recetas pr ON pr.promocion_id = p.id
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 2) Ver duplicados exactos (mismo nombre + tipo + descuento_fijo)
SELECT
  nombre,
  tipo,
  descuento_fijo,
  COUNT(*) AS cantidad,
  ARRAY_AGG(id ORDER BY created_at) AS ids_por_antiguedad
FROM promociones
GROUP BY nombre, tipo, descuento_fijo
HAVING COUNT(*) > 1;

-- 3) Borrar duplicados conservando la más antigua (revisar ids antes de DELETE)
-- Reemplazá UUID-DUPLICADO por el id sobrante del paso 2.
-- DELETE FROM promocion_recetas WHERE promocion_id = 'UUID-DUPLICADO';
-- DELETE FROM promociones WHERE id = 'UUID-DUPLICADO';
