-- Recetas precursoras: poder usar el resultado de otra receta como insumo.
-- Ej: PIZZA COMPLETA usa 1 u de PREPIZZA; PASTAFROLA usa 1 u de MASA SABLE.
-- cantidad + unidad (u) = cuántas unidades del rinde de la receta precursora se usan.

ALTER TABLE receta_ingredientes
  ADD COLUMN IF NOT EXISTS receta_id_precursora uuid REFERENCES recetas(id) ON DELETE SET NULL;

-- No usar la misma receta como precursora de sí misma
ALTER TABLE receta_ingredientes
  DROP CONSTRAINT IF EXISTS receta_ingredientes_no_self_precursora;

ALTER TABLE receta_ingredientes
  ADD CONSTRAINT receta_ingredientes_no_self_precursora
  CHECK (receta_id_precursora IS NULL OR receta_id_precursora != receta_id);

-- Si es precursora, no puede ser insumo a la vez (una fila = un tipo)
ALTER TABLE receta_ingredientes
  DROP CONSTRAINT IF EXISTS receta_ingredientes_insumo_o_precursora;

ALTER TABLE receta_ingredientes
  ADD CONSTRAINT receta_ingredientes_insumo_o_precursora
  CHECK (
    (insumo_id IS NOT NULL AND receta_id_precursora IS NULL)
    OR (insumo_id IS NULL AND receta_id_precursora IS NOT NULL)
    OR (insumo_id IS NULL AND receta_id_precursora IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_precursora
  ON receta_ingredientes(receta_id_precursora) WHERE receta_id_precursora IS NOT NULL;
