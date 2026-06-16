-- Combo: conjunto de productos con cantidades fijas a un precio total (ej. chipa + pizza + empanadas a $22.000)

ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS precio_combo numeric;

ALTER TABLE promocion_recetas
  ADD COLUMN IF NOT EXISTS cantidad numeric NOT NULL DEFAULT 1;

COMMENT ON COLUMN promociones.precio_combo IS
  'Precio total del combo (tipo combo_precio_fijo); en pesos';

COMMENT ON COLUMN promocion_recetas.cantidad IS
  'Cantidad requerida de la receta en el combo; default 1 para otros tipos de promo';

NOTIFY pgrst, 'reload schema';
