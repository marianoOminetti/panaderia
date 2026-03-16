CREATE TABLE IF NOT EXISTS precio_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid REFERENCES insumos(id) ON DELETE CASCADE,
  precio_anterior numeric,
  precio_nuevo numeric,
  fecha timestamptz DEFAULT now(),
  motivo text
);

CREATE INDEX IF NOT EXISTS idx_precio_historial_insumo_fecha
  ON precio_historial(insumo_id, fecha DESC);

