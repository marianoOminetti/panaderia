-- Stock de insumos (materias primas)
CREATE TABLE IF NOT EXISTS insumo_stock (
  insumo_id uuid PRIMARY KEY REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Movimientos: ingresos (compras) y egresos (uso/consumo)
CREATE TABLE IF NOT EXISTS insumo_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  cantidad numeric NOT NULL,
  valor numeric,
  nota text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumo_mov_insumo ON insumo_movimientos(insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_created ON insumo_movimientos(created_at DESC);
