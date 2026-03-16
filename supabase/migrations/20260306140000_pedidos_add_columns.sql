-- Agregar columnas faltantes a pedidos (si la tabla ya existía)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS hora_entrega text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notas text;

-- Agregar índice de estado si no existe
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);

-- Agregar constraint de estado si no existe (ignorar si ya existe)
DO $$
BEGIN
  ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check 
    CHECK (estado IN ('pendiente', 'en_preparacion', 'listo', 'entregado'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
