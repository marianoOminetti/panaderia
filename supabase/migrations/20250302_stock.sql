-- Stock por receta (producto terminado)
CREATE TABLE IF NOT EXISTS stock (
  receta_id uuid PRIMARY KEY REFERENCES recetas(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_stock_receta ON stock(receta_id);
