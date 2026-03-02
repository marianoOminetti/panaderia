-- Agrega transaccion_id para agrupar ventas por voz como 1 venta
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS transaccion_id uuid;
