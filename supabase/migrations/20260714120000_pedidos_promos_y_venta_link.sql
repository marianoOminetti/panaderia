-- Promos en pedidos + vínculo a la venta al entregar (para desentregar)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS descuento numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promocion_id uuid REFERENCES promociones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS venta_transaccion_id uuid;

COMMENT ON COLUMN pedidos.descuento IS 'Descuento de promo repartido en la línea del pedido';
COMMENT ON COLUMN pedidos.promocion_id IS 'Promo aplicada al pedido (si hay una sola)';
COMMENT ON COLUMN pedidos.venta_transaccion_id IS 'transaccion_id de las ventas creadas al marcar entregado';

CREATE INDEX IF NOT EXISTS idx_pedidos_promocion_id ON pedidos(promocion_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_venta_transaccion_id ON pedidos(venta_transaccion_id);
