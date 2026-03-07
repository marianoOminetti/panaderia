-- Tabla de pedidos (ventas futuras con fecha de entrega)
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  senia numeric DEFAULT 0,
  estado text DEFAULT 'pendiente',
  fecha_entrega date NOT NULL,
  hora_entrega text,
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entrega ON pedidos(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_pedido_id ON pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);

ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check 
  CHECK (estado IN ('pendiente', 'en_preparacion', 'listo', 'entregado'));

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all pedidos"
  ON pedidos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert pedidos"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update pedidos"
  ON pedidos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete pedidos"
  ON pedidos FOR DELETE
  TO authenticated
  USING (true);
