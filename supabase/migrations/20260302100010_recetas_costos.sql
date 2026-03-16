-- Agrega campos de costo a recetas
-- - costo_lote: costo total del lote (según ingredientes)
-- - costo_unitario: costo por unidad (costo_lote / rinde)

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS costo_lote numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_unitario numeric NOT NULL DEFAULT 0;

