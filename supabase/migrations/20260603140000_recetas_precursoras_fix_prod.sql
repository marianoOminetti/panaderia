-- Prod: columnas de recetas precursoras + recarga schema PostgREST (idempotente).
-- Si el historial de migraciones ya las aplicó pero la API sigue fallando en update/insert,
-- esto las garantiza en DB y fuerza reload del cache.

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS es_precursora boolean NOT NULL DEFAULT false;

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS gramos_por_unidad numeric;

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS oculto_en_venta boolean NOT NULL DEFAULT false;

ALTER TABLE receta_ingredientes
  ADD COLUMN IF NOT EXISTS receta_id_precursora uuid REFERENCES recetas(id) ON DELETE SET NULL;

ALTER TABLE receta_ingredientes
  DROP CONSTRAINT IF EXISTS receta_ingredientes_no_self_precursora;

ALTER TABLE receta_ingredientes
  ADD CONSTRAINT receta_ingredientes_no_self_precursora
  CHECK (receta_id_precursora IS NULL OR receta_id_precursora != receta_id);

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

NOTIFY pgrst, 'reload schema';
