-- Tipos de promo: % en productos y % por monto mínimo de compra

ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS porcentaje numeric,
  ADD COLUMN IF NOT EXISTS monto_minimo numeric;

ALTER TABLE promociones
  ALTER COLUMN llevar DROP NOT NULL,
  ALTER COLUMN pagar DROP NOT NULL;

ALTER TABLE promociones DROP CONSTRAINT IF EXISTS promociones_pagar_menor_llevar;
