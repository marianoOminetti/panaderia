-- Consolidar insumos duplicados por (nombre, categoria) y agregar UNIQUE
-- Solo actualiza insumo_composicion e insumo_movimientos si existen (prod puede no tenerlas aún).

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
    SELECT nombre, categoria
    FROM insumos
    GROUP BY nombre, categoria
    HAVING COUNT(*) > 1
  LOOP
    SELECT id::uuid
    INTO keep_id
    FROM insumos
    WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria
    ORDER BY id
    LIMIT 1;

    IF has_composicion THEN
      UPDATE insumo_composicion
      SET insumo_id = keep_id
      WHERE insumo_id IN (
        SELECT id FROM insumos
        WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria AND id <> keep_id
      );
    END IF;

    IF has_movimientos THEN
      UPDATE insumo_movimientos
      SET insumo_id = keep_id
      WHERE insumo_id IN (
        SELECT id FROM insumos
        WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria AND id <> keep_id
      );
    END IF;

    -- receta_ingredientes referencia insumos(id); unificar antes de borrar duplicados
    UPDATE receta_ingredientes
    SET insumo_id = keep_id
    WHERE insumo_id IN (
      SELECT id FROM insumos
      WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria AND id <> keep_id
    );

    DELETE FROM insumos
    WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria AND id <> keep_id;
  END LOOP;
END
$$;

ALTER TABLE insumos
  ADD CONSTRAINT insumos_nombre_categoria_unique
  UNIQUE (nombre, categoria);

