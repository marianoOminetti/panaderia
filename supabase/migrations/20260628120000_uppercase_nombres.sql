-- Consolidar insumos que solo difieren en mayúsculas/minúsculas, luego normalizar a UPPERCASE.

DO $$
DECLARE
  r RECORD;
  keep_id uuid;
  has_composicion boolean;
  has_movimientos boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insumo_composicion') INTO has_composicion;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insumo_movimientos') INTO has_movimientos;

  FOR r IN
    SELECT UPPER(TRIM(nombre)) AS nombre_upper, categoria
    FROM insumos
    GROUP BY UPPER(TRIM(nombre)), categoria
    HAVING COUNT(*) > 1
  LOOP
    SELECT id::uuid
    INTO keep_id
    FROM insumos
    WHERE UPPER(TRIM(nombre)) = r.nombre_upper
      AND categoria IS NOT DISTINCT FROM r.categoria
    ORDER BY id
    LIMIT 1;

    IF has_composicion THEN
      UPDATE insumo_composicion
      SET insumo_id = keep_id
      WHERE insumo_id IN (
        SELECT id FROM insumos
        WHERE UPPER(TRIM(nombre)) = r.nombre_upper
          AND categoria IS NOT DISTINCT FROM r.categoria
          AND id <> keep_id
      );
    END IF;

    IF has_movimientos THEN
      UPDATE insumo_movimientos
      SET insumo_id = keep_id
      WHERE insumo_id IN (
        SELECT id FROM insumos
        WHERE UPPER(TRIM(nombre)) = r.nombre_upper
          AND categoria IS NOT DISTINCT FROM r.categoria
          AND id <> keep_id
      );
    END IF;

    UPDATE receta_ingredientes
    SET insumo_id = keep_id
    WHERE insumo_id IN (
      SELECT id FROM insumos
      WHERE UPPER(TRIM(nombre)) = r.nombre_upper
        AND categoria IS NOT DISTINCT FROM r.categoria
        AND id <> keep_id
    );

    DELETE FROM insumos
    WHERE UPPER(TRIM(nombre)) = r.nombre_upper
      AND categoria IS NOT DISTINCT FROM r.categoria
      AND id <> keep_id;
  END LOOP;
END
$$;

UPDATE insumos SET nombre = UPPER(TRIM(nombre)) WHERE nombre IS NOT NULL;

UPDATE recetas SET nombre = UPPER(TRIM(nombre)) WHERE nombre IS NOT NULL;

UPDATE recetas
SET familia = UPPER(TRIM(familia))
WHERE familia IS NOT NULL AND TRIM(familia) <> '';

UPDATE recetas SET familia = NULL WHERE familia IS NOT NULL AND TRIM(familia) = '';
