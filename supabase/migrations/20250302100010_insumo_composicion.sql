-- Insumos compuestos: cuando un insumo (ej. premezcla) es una mezcla de otros insumos,
-- definimos la proporción para que al consumir el padre se descuente automáticamente de los hijos.
-- factor = gramos de hijo por cada gramo de padre. Ej: 1g premezcla = 0.5g harina → factor 0.5

CREATE TABLE IF NOT EXISTS insumo_composicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  insumo_id_componente uuid NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  factor numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(insumo_id, insumo_id_componente),
  CHECK (insumo_id != insumo_id_componente),
  CHECK (factor > 0 AND factor <= 1)
);

CREATE INDEX IF NOT EXISTS idx_insumo_composicion_insumo ON insumo_composicion(insumo_id);
