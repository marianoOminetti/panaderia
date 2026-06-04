-- Promo: descuento fijo en pesos por cada unidad vendida (ej. $1000 off por tarta)

ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS descuento_fijo numeric;

COMMENT ON COLUMN promociones.descuento_fijo IS
  'Monto a descontar por cada unidad (tipo descuento_fijo_unidad); en pesos';

NOTIFY pgrst, 'reload schema';
