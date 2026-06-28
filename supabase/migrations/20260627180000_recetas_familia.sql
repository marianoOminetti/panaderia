-- Agrupación opcional de variantes (Brownie, Pastafrola, etc.)
ALTER TABLE recetas ADD COLUMN IF NOT EXISTS familia text;

COMMENT ON COLUMN recetas.familia IS 'Familia opcional para agrupar variantes de venta (ej. Brownie, Pastafrola)';
