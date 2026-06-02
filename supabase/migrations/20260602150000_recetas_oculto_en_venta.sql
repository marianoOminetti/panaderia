-- Ocultar receta en la lista de Nueva venta (sigue en recetas, stock, promos, historial).
ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS oculto_en_venta boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN recetas.oculto_en_venta IS 'Si true, no aparece en la lista de productos al vender.';
