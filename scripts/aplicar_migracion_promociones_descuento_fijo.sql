-- Ejecutar en Supabase → SQL Editor (proyecto que usa la app)
-- Corrige: Could not find the 'descuento_fijo' column of 'promociones' in the schema cache
-- (necesario para promos tipo "descuento fijo por unidad")

ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS descuento_fijo numeric;

COMMENT ON COLUMN promociones.descuento_fijo IS
  'Monto a descontar por cada unidad (tipo descuento_fijo_unidad); en pesos';

NOTIFY pgrst, 'reload schema';
