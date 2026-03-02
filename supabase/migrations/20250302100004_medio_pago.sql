-- Medio de pago: efectivo o transferencia
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS medio_pago text DEFAULT 'efectivo' CHECK (medio_pago IN ('efectivo', 'transferencia'));
