-- EJECUTAR A MANO en Supabase Dashboard → SQL Editor solo si db push falla.
-- Solo toca tablas que existan (insumo_composicion e insumo_movimientos pueden no estar en prod).

DO $$
DECLARE
  r RECORD;
  keep_id uuid;
  has_composicion boolean;
  has_movimientos boolean;
  has_receta_ing boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insumo_composicion') INTO has_composicion;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insumo_movimientos') INTO has_movimientos;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receta_ingredientes') INTO has_receta_ing;

  -- Primero: redirigir TODAS las FKs a los keep_id (una pasada por tabla)
  FOR r IN
    SELECT nombre, categoria
    FROM insumos
    GROUP BY nombre, categoria
    HAVING COUNT(*) > 1
  LOOP
    SELECT id
    INTO keep_id
    FROM insumos
    WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria
    ORDER BY id
    LIMIT 1;

    IF has_receta_ing THEN
      UPDATE receta_ingredientes
      SET insumo_id = keep_id
      WHERE insumo_id IN (
        SELECT id FROM insumos
        WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria AND id <> keep_id
      );
    END IF;

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
  END LOOP;

  -- Después: borrar insumos duplicados (ya no referenciados)
  FOR r IN
    SELECT nombre, categoria
    FROM insumos
    GROUP BY nombre, categoria
    HAVING COUNT(*) > 1
  LOOP
    SELECT id
    INTO keep_id
    FROM insumos
    WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria
    ORDER BY id
    LIMIT 1;

    DELETE FROM insumos
    WHERE nombre = r.nombre AND categoria IS NOT DISTINCT FROM r.categoria AND id <> keep_id;
  END LOOP;
END
$$;

ALTER TABLE insumos
  ADD CONSTRAINT insumos_nombre_categoria_unique
  UNIQUE (nombre, categoria);
