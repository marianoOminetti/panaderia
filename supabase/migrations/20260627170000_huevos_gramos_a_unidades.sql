-- Huevos: recetas cargadas en gramos cuando en realidad eran unidades (ej. 4 g → 4 u).
-- El insumo Huevos se compra y descuenta en unidades; 50 g = 1 u solo aplica si se mide en peso.

UPDATE receta_ingredientes ri
SET unidad = 'u'
FROM insumos i
WHERE ri.insumo_id = i.id
  AND i.nombre ILIKE '%huevo%'
  AND LOWER(TRIM(COALESCE(ri.unidad, ''))) = 'g';

NOTIFY pgrst, 'reload schema';
