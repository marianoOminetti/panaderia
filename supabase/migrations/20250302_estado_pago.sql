-- Estado del pago: pagado o debe
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_pago text DEFAULT 'pagado' CHECK (estado_pago IN ('pagado', 'debe'));
